<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/composables/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const { t } = useTranslation();
const auth = useAuthStore();
const router = useRouter();

const rating = computed(() => Math.round(auth.user!.rating));
const sigma = computed(() => Math.round(auth.user!.sigma));

onMounted(async () => {
  if (!auth.isAuthenticated) router.push('/signin');

  await auth.refresh()
});
</script>

<template>
  <div class="w-full h-full overflow-y-auto flex items-start justify-center px-4 py-8">
    <div class="w-full max-w-lg flex flex-col gap-4">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            {{ t('stats.ratingLabel') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span
            class="text-7xl font-black tracking-tight bg-linear-to-br from-primary to-primary/50 bg-clip-text text-transparent">
            {{ rating }}
          </span>
          <span class="ml-12">sigma {{ sigma }}</span>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
