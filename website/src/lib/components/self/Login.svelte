<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';

	function handleGoogleLogin() {
		// Implement Google OAuth logic here
		console.log('Google login clicked');
	}
</script>

<div class="flex h-screen items-center justify-center">
	<Card class="w-[350px]">
		<CardHeader>
			<CardTitle>Welcome Back</CardTitle>
			<CardDescription>Sign in to your account</CardDescription>
		</CardHeader>
		<CardContent>
			<Button variant="outline" class="w-full" onclick={handleGoogleLogin}>
				<img
					class="mr-2 h-4 w-4"
					src="https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA"
					alt="Google"
				/>
				Sign in with Google
			</Button>
		</CardContent>
	</Card>
</div>
