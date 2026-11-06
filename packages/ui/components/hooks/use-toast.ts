// Inspired by react-hot-toast library
import * as React from "react";

import type { ToastActionElement, ToastProps } from "@ui/components/toast";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;
/** An identical error toast asked for this soon after one still open is not shown again. */
const DUPLICATE_WINDOW_MS = 10_000;
/** How deep `isSameContent` compares props before calling content different. */
const MAX_CONTENT_DEPTH = 6;

export type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

export interface Toast extends Omit<ToasterToast, "id"> {}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/** Whether two pieces of toast content (text, elements, their props) render the same. */
function isSameContent(a: unknown, b: unknown, depth = 0): boolean {
  if (Object.is(a, b)) return true;
  if (depth > MAX_CONTENT_DEPTH) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => isSameContent(item, b[index], depth + 1));
  }
  if (React.isValidElement(a) && React.isValidElement(b)) {
    return a.type === b.type && a.key === b.key && isSameContent(a.props, b.props, depth + 1);
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && isSameContent(a[key], b[key], depth + 1))
    );
  }
  return false;
}

const isSameToast = (shown: ToasterToast, props: Toast): boolean =>
  shown.variant === props.variant &&
  isSameContent(shown.title, props.title) &&
  isSameContent(shown.description, props.description) &&
  isSameContent(shown.action, props.action);

const shownAt = new Map<string, number>();

function handleOf(id: string) {
  return {
    id,
    dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
    update: (props: ToasterToast) => dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } }),
  };
}

/** The handle of an identical error toast still open and shown less than DUPLICATE_WINDOW_MS ago. */
function findRecentDuplicate(props: Toast) {
  if (props.variant !== "destructive") return undefined;
  const now = Date.now();
  shownAt.forEach((at, id) => {
    if (now - at >= DUPLICATE_WINDOW_MS) shownAt.delete(id);
  });
  const duplicate = memoryState.toasts.find(
    (shown) => shown.open && shownAt.has(shown.id) && isSameToast(shown, props)
  );
  return duplicate && handleOf(duplicate.id);
}

/**
 * Shows a toast and returns its handle. The same error reported by several failing calls at once
 * shows once: a destructive toast identical to one still open that was shown less than
 * DUPLICATE_WINDOW_MS ago is not added, and the open one's handle is returned instead. Toasts of
 * other variants always show, so each of two identical successful actions gets its feedback.
 */
function toast({ ...props }: Toast) {
  const duplicate = findRecentDuplicate(props);
  if (duplicate) return duplicate;

  const id = genId();
  shownAt.set(id, Date.now());
  const handle = handleOf(id);

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) handle.dismiss();
      },
    },
  });

  return handle;
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };
