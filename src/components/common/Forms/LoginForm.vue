<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'vue-sonner';
import { useTranslation } from '@/composables/useTranslation';

const router = useRouter();
const auth = useAuthStore();
const { t } = useTranslation();

const email = ref('');
const password = ref('');

const errorMsg = ref('');

const handleSubmit = async () => {
  if (!email.value || !password.value) {
    // Handle empty fields error
    errorMsg.value = t('authPage.errorAllFieldsRequired');
    return;
  }

  const res = await auth.login({ email: email.value, password: password.value });
  if (res.isOk) {
    router.push('/');
  } else {
    toast.error(res.message || t('authPage.errorLoginFailed'));
  }
};
</script>

<template>
  <Card class="w-96">
    <CardHeader>
      <CardTitle>{{ t('authPage.formLoginTitle') }}</CardTitle>
      <CardDescription> {{ t('authPage.formLoginDescription') }} </CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <Label for="email">{{ t('authPage.formEmail') }}</Label>
            <Input
              id="email"
              type="email"
              :placeholder="t('authPage.formEmail')"
              autocomplete="email"
              class="w-full"
              v-model.trim="email"
            />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="password"> {{ t('authPage.formPassword') }}</Label>
            <Input
              id="password"
              type="password"
              :placeholder="t('authPage.formPassword')"
              class="w-full"
              autocomplete="current-password"
              v-model="password"
            />
          </div>
          <Button type="submit" class="w-full">{{ t('authPage.formLoginSubmit') }}</Button>
          <span v-show="errorMsg" class="text-red-500 animate-shake">{{ errorMsg }}</span>
        </div>
      </form>
    </CardContent>
    <CardFooter>
      <div class="flex flex-col gap-2 w-full">
        <Button variant="outline" class="w-full" @click="router.push('/signup')">
          {{ t('authPage.formRegisterSubmit') }}</Button
        >
      </div>
    </CardFooter>
  </Card>
</template>
