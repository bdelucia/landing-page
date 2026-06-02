<script>
	import geminiIcon from '$lib/assets/logos/Google_Gemini_icon_2025.svg';
	import { Input, InputIcon, InputSubmit } from '$lib/src/components/Input';
</script>

<div class="flex h-full flex-col items-center justify-center gap-8 px-4">
	<Input>
		{#snippet leadingIcon()}
			<InputIcon src={geminiIcon} alt="Gemini" />
		{/snippet}
		{#snippet trailingIcon()}
			<InputSubmit />
		{/snippet}
	</Input>
</div>
