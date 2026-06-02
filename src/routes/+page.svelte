<script lang="ts">
	import geminiIcon from '$lib/assets/logos/Google_Gemini_icon_2025.svg';
	import { sendToGemini } from '$lib/send-to-gemini';
	import { Input, InputIcon, InputSubmit } from '$lib/src/components/Input';

	let prompt = $state('');

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		sendToGemini(prompt);
	}
</script>

<div class="flex h-full flex-col items-center justify-center gap-8 px-4">
	<form class="w-full max-w-3xl" onsubmit={handleSubmit}>
		<Input bind:value={prompt}>
			{#snippet leadingIcon()}
				<InputIcon src={geminiIcon} alt="Gemini" />
			{/snippet}
			{#snippet trailingIcon()}
				<InputSubmit />
			{/snippet}
		</Input>
	</form>
</div>
