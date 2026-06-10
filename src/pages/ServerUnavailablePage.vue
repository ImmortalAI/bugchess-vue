<script setup lang="ts">
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/composables/useTranslation';
import { ServerCrash } from '@lucide/vue';

const { t } = useTranslation();

const reloadPage = () => {
  window.location.reload();
};
</script>

<template>
  <div class="w-full h-full flex items-center justify-center">
    <Card class="w-96 text-center">
      <CardHeader class="items-center gap-4 pb-2">
        <ServerCrash class="w-12 h-12 text-muted-foreground" />
        <CardTitle>{{ t('serverUnavailable.title') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground">{{ t('serverUnavailable.description') }}</p>
      </CardContent>
      <CardFooter class="justify-center">
        <Button @click="reloadPage">{{ t('serverUnavailable.retryBtn') }}</Button>
      </CardFooter>
    </Card>
  </div>
</template>
