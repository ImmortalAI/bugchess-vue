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

const username = ref('');
const email = ref('');
const password = ref('');
const repeatPassword = ref('');

const errorMsg = ref('');

const handleSubmit = async () => {
  if (!username.value || !email.value || !password.value || !repeatPassword.value) {
    // Handle empty fields error
    errorMsg.value = t('authPage.errorAllFieldsRequired');
    return;
  }

  if (password.value !== repeatPassword.value) {
    // Handle password mismatch error
    errorMsg.value = t('authPage.errorPasswordMismatch');
    return;
  }

  const res = await auth.register({
    username: username.value,
    email: email.value,
    password: password.value,
    repeat_password: repeatPassword.value,
  });
  if (res.isOk) {
    toast.success(t('authPage.successRegister'));
    router.push('/');
  } else {
    toast.error(res.message || t('authPage.errorRegisterFailed'));
  }
};
</script>

<template>
  <Card class="w-96">
    <CardHeader>
      <CardTitle>{{ t('authPage.formRegisterTitle') }}</CardTitle>
      <CardDescription> {{ t('authPage.formRegisterDescription') }} </CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <Label for="username">{{ t('authPage.formUsername') }}</Label>
            <Input
              id="username"
              type="text"
              :placeholder="t('authPage.formUsername')"
              class="w-full"
              autocomplete="username"
              v-model.trim="username"
            />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="email">{{ t('authPage.formEmail') }}</Label>
            <Input
              id="email"
              type="text"
              :placeholder="t('authPage.formEmail')"
              class="w-full"
              autocomplete="email"
              v-model.trim="email"
            />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="password">{{ t('authPage.formPassword') }}</Label>
            <Input
              id="password"
              type="password"
              :placeholder="t('authPage.formPassword')"
              class="w-full"
              autocomplete="new-password"
              v-model="password"
            />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="confirm-password">{{ t('authPage.formPasswordRepeat') }}</Label>
            <Input
              id="confirm-password"
              type="password"
              :placeholder="t('authPage.formPasswordRepeat')"
              class="w-full"
              autocomplete="new-password"
              v-model="repeatPassword"
            />
          </div>
          <Button type="submit" class="w-full">{{ t('authPage.formRegisterSubmit') }}</Button>
          <span v-show="errorMsg" class="text-red-500 animate-shake">{{ errorMsg }}</span>
        </div>
      </form>
    </CardContent>
    <CardFooter>
      <div class="flex flex-col gap-2 w-full">
        <Button variant="outline" class="w-full" @click="router.push('/signin')">{{
          t('authPage.formLoginSubmit')
        }}</Button>
      </div>
    </CardFooter>
  </Card>
</template>
