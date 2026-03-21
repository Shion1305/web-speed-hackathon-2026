import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import { DirectMessageGate } from "@web-speed-hackathon-2026/client/src/components/direct_message/DirectMessageGate";
import { DirectMessagePage } from "@web-speed-hackathon-2026/client/src/components/direct_message/DirectMessagePage";
import { NotFoundContainer } from "@web-speed-hackathon-2026/client/src/containers/NotFoundContainer";
import { DirectMessageFormData } from "@web-speed-hackathon-2026/client/src/direct_message/types";
import { useWs } from "@web-speed-hackathon-2026/client/src/hooks/use_ws";
import { fetchJSON, sendJSON } from "@web-speed-hackathon-2026/client/src/utils/fetchers";

interface DmUpdateEvent {
  type: "dm:conversation:message";
  payload: Models.DirectMessage;
}
interface DmTypingEvent {
  type: "dm:conversation:typing";
  payload: {};
}

const MESSAGE_PAGE_LIMIT = 80;

function mergeConversationMessage(
  conversation: Models.DirectMessageConversation,
  message: Models.DirectMessage,
): Models.DirectMessageConversation {
  const messages = conversation.messages ?? [];
  const nextMessages = [...messages];
  const messageIndex = nextMessages.findIndex((current) => current.id === message.id);

  if (messageIndex === -1) {
    nextMessages.push(message);
  } else {
    nextMessages[messageIndex] = message;
  }

  return {
    ...conversation,
    messages: nextMessages,
  };
}

function mergeOlderConversationMessages(
  conversation: Models.DirectMessageConversation,
  olderMessages: Models.DirectMessage[],
  hasMoreBefore: boolean | undefined,
): Models.DirectMessageConversation {
  const knownMessageIds = new Set(conversation.messages.map((message) => message.id));
  const prependMessages = olderMessages.filter((message) => knownMessageIds.has(message.id) === false);

  return {
    ...conversation,
    hasMoreBefore,
    messages: [...prependMessages, ...conversation.messages],
  };
}

const TYPING_INDICATOR_DURATION_MS = 10 * 1000;

interface Props {
  activeUser: Models.User | null;
  authModalId: string;
}

export const DirectMessageContainer = ({ activeUser, authModalId }: Props) => {
  const { conversationId = "" } = useParams<{ conversationId: string }>();

  const [conversation, setConversation] = useState<Models.DirectMessageConversation | null>(null);
  const [conversationError, setConversationError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const peerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConversation = useCallback(async () => {
    if (activeUser == null) {
      return;
    }

    try {
      const data = await fetchJSON<Models.DirectMessageConversation>(
        `/api/v1/dm/${conversationId}?limit=${MESSAGE_PAGE_LIMIT}`,
      );
      setConversation(data);
      setConversationError(null);
    } catch (error) {
      setConversation(null);
      setConversationError(error as Error);
    }
  }, [activeUser, conversationId]);

  const sendRead = useCallback(async () => {
    await sendJSON(`/api/v1/dm/${conversationId}/read`, {});
  }, [conversationId]);

  useEffect(() => {
    setConversation(null);
    setConversationError(null);
    setIsPeerTyping(false);
    if (peerTypingTimeoutRef.current !== null) {
      clearTimeout(peerTypingTimeoutRef.current);
      peerTypingTimeoutRef.current = null;
    }

    void loadConversation();
    void sendRead();

    return () => {
      if (peerTypingTimeoutRef.current !== null) {
        clearTimeout(peerTypingTimeoutRef.current);
        peerTypingTimeoutRef.current = null;
      }
    };
  }, [loadConversation, sendRead]);

  const handleLoadOlder = useCallback(async () => {
    if (conversation == null || conversation.hasMoreBefore !== true || isLoadingOlder) {
      return;
    }

    const oldestMessage = conversation.messages[0];
    if (oldestMessage == null) {
      return;
    }

    setIsLoadingOlder(true);
    try {
      const olderBatch = await fetchJSON<Models.DirectMessageConversation>(
        `/api/v1/dm/${conversationId}?limit=${MESSAGE_PAGE_LIMIT}&before=${encodeURIComponent(
          oldestMessage.createdAt,
        )}`,
      );
      setConversation((current) => {
        if (current == null) {
          return current;
        }
        return mergeOlderConversationMessages(current, olderBatch.messages, olderBatch.hasMoreBefore);
      });
    } catch {
      // Preserve existing messages when loading older batches fails.
    } finally {
      setIsLoadingOlder(false);
    }
  }, [conversation, conversationId, isLoadingOlder]);

  const handleSubmit = useCallback(
    async (params: DirectMessageFormData) => {
      setIsSubmitting(true);
      try {
        const message = await sendJSON<Models.DirectMessage>(`/api/v1/dm/${conversationId}/messages`, {
          body: params.body,
        });
        setConversation((current) => {
          if (current == null) {
            return current;
          }
          return mergeConversationMessage(current, message);
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [conversationId],
  );

  const handleTyping = useCallback(async () => {
    void sendJSON(`/api/v1/dm/${conversationId}/typing`, {});
  }, [conversationId]);

  useWs(`/api/v1/dm/${conversationId}`, (event: DmUpdateEvent | DmTypingEvent) => {
    if (event.type === "dm:conversation:message") {
      setConversation((current) => {
        if (current == null) {
          return current;
        }
        return mergeConversationMessage(current, event.payload);
      });

      if (event.payload.sender.id !== activeUser?.id) {
        setIsPeerTyping(false);
        if (peerTypingTimeoutRef.current !== null) {
          clearTimeout(peerTypingTimeoutRef.current);
        }
        peerTypingTimeoutRef.current = null;
        void sendRead();
      }
    } else if (event.type === "dm:conversation:typing") {
      setIsPeerTyping(true);
      if (peerTypingTimeoutRef.current !== null) {
        clearTimeout(peerTypingTimeoutRef.current);
      }
      peerTypingTimeoutRef.current = setTimeout(() => {
        setIsPeerTyping(false);
      }, TYPING_INDICATOR_DURATION_MS);
    }
  });

  if (activeUser === null) {
    return (
      <DirectMessageGate
        headline="DMを利用するにはサインインしてください"
        authModalId={authModalId}
      />
    );
  }

  if (conversation == null) {
    if (conversationError != null) {
      return <NotFoundContainer />;
    }
    return null;
  }

  const peer =
    conversation.initiator.id !== activeUser?.id ? conversation.initiator : conversation.member;

  return (
    <>
      <Helmet>
        <title>{peer.name} さんとのダイレクトメッセージ - CaX</title>
      </Helmet>
      <DirectMessagePage
        conversationError={conversationError}
        conversation={conversation}
        activeUser={activeUser}
        hasMoreBefore={conversation.hasMoreBefore === true}
        isLoadingOlder={isLoadingOlder}
        onLoadOlder={handleLoadOlder}
        onTyping={handleTyping}
        isPeerTyping={isPeerTyping}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </>
  );
};
