import { getContext, setContext } from 'svelte';

const INPUT_CONTEXT_KEY = Symbol('input');

export type InputContext = {
	readonly hasValue: boolean;
};

export function setInputContext(context: InputContext) {
	setContext(INPUT_CONTEXT_KEY, context);
}

export function getInputContext(): InputContext | undefined {
	return getContext<InputContext | undefined>(INPUT_CONTEXT_KEY);
}
