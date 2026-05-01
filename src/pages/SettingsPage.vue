<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/composables/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { computed, ref } from 'vue';

const { t } = useTranslation();
const auth = useAuthStore();

const email = ref(auth.user?.email ?? '');
const username = ref(auth.user?.username ?? '');
const currentPassword = ref('');
const newPassword = ref('');
const repeatPassword = ref('');

const isProfileDirty = computed(
  () => email.value !== auth.user?.email || username.value !== auth.user?.username,
);
const isPasswordReady = computed(
  () => !!currentPassword.value && !!newPassword.value && !!repeatPassword.value,
);
const canSave = computed(() => isProfileDirty.value || isPasswordReady.value);

const handleSave = () => {
  // TODO: implement when backend is ready
};
</script>

<template>
  <div class="w-full h-full overflow-y-auto flex items-start justify-center px-4 py-8">
    <Card class="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{{ t('settings.pageTitle') }}</CardTitle>
      </CardHeader>

      <form @submit.prevent="handleSave">
        <CardContent class="flex flex-col gap-8 mb-8">
          <!-- Profile section -->
          <section class="flex flex-col gap-4">
            <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {{ t('settings.profileTitle') }}
            </h2>
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <Label for="settings-username">{{ t('authPage.formUsername') }}</Label>
                <Input
                  id="settings-username"
                  type="text"
                  autocomplete="username"
                  v-model.trim="username"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label for="settings-email">{{ t('authPage.formEmail') }}</Label>
                <Input id="settings-email" type="email" autocomplete="email" v-model.trim="email" />
              </div>
            </div>
          </section>

          <div class="border-t border-border" />

          <!-- Change password section -->
          <section class="flex flex-col gap-4">
            <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {{ t('settings.passwordTitle') }}
            </h2>
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <Label for="settings-current-password">{{ t('settings.currentPassword') }}</Label>
                <Input
                  id="settings-current-password"
                  type="password"
                  autocomplete="current-password"
                  v-model="currentPassword"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label for="settings-new-password">{{ t('settings.newPassword') }}</Label>
                <Input
                  id="settings-new-password"
                  type="password"
                  autocomplete="new-password"
                  v-model="newPassword"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label for="settings-repeat-password">{{ t('authPage.formPasswordRepeat') }}</Label>
                <Input
                  id="settings-repeat-password"
                  type="password"
                  autocomplete="new-password"
                  v-model="repeatPassword"
                />
              </div>
            </div>
          </section>
        </CardContent>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <CardFooter v-if="canSave" class="border-t">
            <Button type="submit" class="w-full">{{ t('settings.save') }}</Button>
          </CardFooter>
        </Transition>
      </form>
    </Card>
  </div>
</template>
