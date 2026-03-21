import {
  combineReducers,
  legacy_createStore as createStore,
  type Dispatch,
  type UnknownAction,
} from "redux";

const noopReducer = (state = null) => state;

export type RootState = { __noop: null };
export type AppDispatch = Dispatch<UnknownAction>;

export const store = createStore(combineReducers({ __noop: noopReducer }));
