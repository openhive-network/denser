import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement, Fragment, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const { LoggedUserContexts, useLoggedUserContext, useLoggedUserManabars } = await import(
  './logged-user-contexts.ts'
);

type ContextsProps = Parameters<typeof LoggedUserContexts>[0];
type Manabars = NonNullable<ContextsProps['manabars']>;
type Account = NonNullable<ContextsProps['loggedUser']>;

function manabars(rcPercent: number): Manabars {
  const bar = { max: '100', current: String(rcPercent), percentageValue: rcPercent, cooldown: new Date(0) };
  return { upvote: bar, downvote: bar, rc: bar };
}

// Only the fields the contexts read; the rest of FullAccount is irrelevant here.
const ACCOUNT = { name: 'alice', reputation: 61 } as unknown as Account;

describe('LoggedUserContexts', () => {
  let dom: JSDOM;
  let root: Root;
  let container: HTMLElement;

  before(() => {
    dom = new JSDOM('<!doctype html><div id="root"></div>');
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
    container = dom.window.document.getElementById('root') as HTMLElement;
    root = createRoot(container);
  });

  after(() => {
    act(() => root.unmount());
    dom.window.close();
  });

  it('re-renders manabar readers on a manabar refetch, but not reputation-only readers', () => {
    const renders = { reputation: 0, manabars: 0 };
    let setManabars: (value: Manabars) => void = () => {};

    function ReputationReader() {
      renders.reputation += 1;
      const { reputation } = useLoggedUserContext();
      return createElement('span', { id: 'reputation' }, String(reputation));
    }

    function ManabarsReader() {
      renders.manabars += 1;
      const data = useLoggedUserManabars();
      return createElement('span', { id: 'rc' }, String(data?.rc.percentageValue));
    }

    // Stands in for LoggedUserProvider: owns the manabars state the way the query does,
    // and receives its children from above, so they are stable elements across its renders.
    function Provider({ children }: { children: ReactNode }) {
      const [data, setData] = useState(manabars(40));
      setManabars = setData;
      return createElement(LoggedUserContexts, { loggedUser: ACCOUNT, netVests: 0, manabars: data, children });
    }

    act(() =>
      root.render(
        createElement(
          Provider,
          null,
          createElement(Fragment, null, createElement(ReputationReader), createElement(ManabarsReader))
        )
      )
    );
    const text = (id: string) => container.querySelector(`#${id}`)?.textContent;
    assert.equal(text('reputation'), '61');
    assert.equal(text('rc'), '40');
    const initial = { ...renders };

    act(() => setManabars(manabars(75)));
    act(() => setManabars(manabars(90)));

    assert.equal(text('rc'), '90');
    assert.equal(renders.manabars, initial.manabars + 2);
    assert.equal(renders.reputation, initial.reputation);
  });
});
