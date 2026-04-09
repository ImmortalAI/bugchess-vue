<script setup lang="ts">
import { useRouter } from 'vue-router';
import Button from '../ui/button/Button.vue';
import { Languages, Moon, Sun } from 'lucide-vue-next';
import { useTranslation } from '@/composables/useTranslation';
import { useDark, useToggle } from '@vueuse/core';

const router = useRouter();

const { locale, setLanguage, t } = useTranslation();

const dark = useDark();
const toggleDark = useToggle(dark);
</script>

<template>
  <div class="flex justify-between items-center w-full absolute top-0 left-0 px-4 py-2">
    <h1 class="text-2xl font-bold cursor-pointer" @click="router.push('/')">Bugchess</h1>
    <div class="flex gap-4">
      <Button @click="router.push('signin')"> {{ t('header.loginBtn') }} </Button>
      <Button
        variant="outline"
        size="icon"
        @click="locale === 'en' ? setLanguage('ru') : setLanguage('en')"
      >
        <Languages class="size-4" />
      </Button>
      <Button variant="outline" size="icon" @click="toggleDark()">
        <Moon v-if="dark" class="size-4" />
        <Sun v-else class="size-4" />
      </Button>
    </div>
  </div>
</template>
