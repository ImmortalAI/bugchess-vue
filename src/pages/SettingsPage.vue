<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/composables/useTranslation';
import { useQuickMessages } from '@/composables/useQuickMessages';
import { useAuthStore } from '@/stores/auth';
import { usersPatch } from '@/api/users/users.service';
import type { UserPatch } from '@/api/users/users.model';
import type { ApiErrorResponse } from '@/api/base/base.model';
import { isAxiosError } from 'axios';
import { toast } from 'vue-sonner';
import { computed, ref } from 'vue';
import { Trash2, Plus, RotateCcw } from '@lucide/vue';

const { t } = useTranslation();
const auth = useAuthStore();
const { messages, add, remove, reset } = useQuickMessages();

const email = ref(auth.user?.email ?? '');
const username = ref(auth.user?.username ?? '');
const currentPassword = ref('');
const newPassword = ref('');
const repeatPassword = ref('');
const isSaving = ref(false);

const newMessage = ref('');

const isProfileDirty = computed(
  () => email.value !== auth.user?.email || username.value !== auth.user?.username,
);
const isPasswordReady = computed(
  () => !!currentPassword.value && !!newPassword.value && !!repeatPassword.value,
);
const canSave = computed(() => isProfileDirty.value || isPasswordReady.value);

const handleSave = async () => {
  if (!auth.user) return;

  const patch: UserPatch = {};
  if (isProfileDirty.value) {
    if (email.value !== auth.user.email) patch.email = email.value;
    if (username.value !== auth.user.username) patch.username = username.value;
  }
  if (isPasswordReady.value) {
    patch.old_password = currentPassword.value;
    patch.password = newPassword.value;
    patch.repeat_password = repeatPassword.value;
  }

  isSaving.value = true;
  try {
    await usersPatch(auth.user.id, patch);
    await auth.refresh();
    currentPassword.value = '';
    newPassword.value = '';
    repeatPassword.value = '';
    toast.success(t('settings.saveSuccess'));
  } catch (e) {
    const message = isAxiosError(e)
      ? ((e.response?.data as ApiErrorResponse)?.detail ?? t('settings.saveError'))
      : t('settings.saveError');
    toast.error(message);
  } finally {
    isSaving.value = false;
  }
};

const handleAddMessage = () => {
  const text = newMessage.value.trim();
  if (!text) return;
  add(text);
  newMessage.value = '';
};
</script>

<template>
  <div class="w-full h-full overflow-y-auto flex items-start justify-center px-4 py-8">
    <Card class="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{{ t('settings.pageTitle') }}</CardTitle>
      </CardHeader>

      <Tabs default-value="profile">
        <CardContent class="pb-0">
          <TabsList class="w-full">
            <TabsTrigger value="profile" class="flex-1">{{ t('settings.tabProfile') }}</TabsTrigger>
            <TabsTrigger value="chat" class="flex-1">{{ t('settings.tabChat') }}</TabsTrigger>
          </TabsList>
        </CardContent>

        <!-- Profile tab -->
        <TabsContent value="profile">
          <form @submit.prevent="handleSave">
            <CardContent class="flex flex-col gap-8 mb-8 pt-6">
              <section class="flex flex-col gap-4">
                <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {{ t('settings.profileTitle') }}
                </h2>
                <div class="flex flex-col gap-4">
                  <div class="flex flex-col gap-2">
                    <Label for="settings-username">{{ t('authPage.formUsername') }}</Label>
                    <Input id="settings-username" type="text" autocomplete="username" v-model.trim="username" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <Label for="settings-email">{{ t('authPage.formEmail') }}</Label>
                    <Input id="settings-email" type="email" autocomplete="email" v-model.trim="email" />
                  </div>
                </div>
              </section>

              <div class="border-t border-border" />

              <section class="flex flex-col gap-4">
                <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {{ t('settings.passwordTitle') }}
                </h2>
                <div class="flex flex-col gap-4">
                  <div class="flex flex-col gap-2">
                    <Label for="settings-current-password">{{
                      t('settings.currentPassword')
                      }}</Label>
                    <Input id="settings-current-password" type="password" autocomplete="current-password"
                      v-model="currentPassword" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <Label for="settings-new-password">{{ t('settings.newPassword') }}</Label>
                    <Input id="settings-new-password" type="password" autocomplete="new-password"
                      v-model="newPassword" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <Label for="settings-repeat-password">{{
                      t('authPage.formPasswordRepeat')
                      }}</Label>
                    <Input id="settings-repeat-password" type="password" autocomplete="new-password"
                      v-model="repeatPassword" />
                  </div>
                </div>
              </section>
            </CardContent>

            <Transition enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-150 ease-in" leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-2">
              <CardFooter v-if="canSave" class="border-t">
                <Button type="submit" class="w-full" :disabled="isSaving">
                  {{ t('settings.save') }}
                </Button>
              </CardFooter>
            </Transition>
          </form>
        </TabsContent>

        <!-- Chat tab -->
        <TabsContent value="chat">
          <CardContent class="flex flex-col gap-6 pt-6">
            <section class="flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {{ t('settings.quickMessages') }}
                </h2>
                <Button variant="ghost" size="sm" class="gap-1.5 text-muted-foreground" @click="reset">
                  <RotateCcw class="size-3.5" />
                  {{ t('settings.quickMessagesReset') }}
                </Button>
              </div>

              <div class="flex flex-col gap-2">
                <p v-if="messages.length === 0" class="text-sm text-muted-foreground py-2">
                  {{ t('settings.quickMessagesEmpty') }}
                </p>
                <div v-for="(_, index) in messages" :key="index" class="flex items-center gap-2">
                  <Input v-model="messages[index]" class="flex-1" />
                  <Button variant="ghost" size="icon" class="shrink-0 text-muted-foreground hover:text-destructive"
                    @click="remove(index)">
                    <Trash2 class="size-4" />
                  </Button>
                </div>
              </div>

              <form class="flex flex-col gap-2 sm:flex-row" @submit.prevent="handleAddMessage">
                <Input v-model.trim="newMessage" :placeholder="t('settings.quickMessagesPlaceholder')" class="flex-1" />
                <Button type="submit" variant="outline" class="gap-1.5" :disabled="!newMessage">
                  <Plus class="size-4" />
                  {{ t('settings.quickMessagesAdd') }}
                </Button>
              </form>
            </section>
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  </div>
</template>
