<script setup lang="ts">
import multiavatar from '@multiavatar/multiavatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/composables/useTranslation';
import { useDark, useToggle } from '@vueuse/core';
import { computed } from 'vue';
import { Languages, LogIn, Moon, Sun } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const props = withDefaults(defineProps<{ grayscale?: boolean }>(), { grayscale: false });

const auth = useAuthStore();
const { locale, setLanguage, t } = useTranslation();
const router = useRouter();

const dark = useDark();
const toggleDark = useToggle(dark);

const displayName = computed(() => auth.user?.username ?? t('header.guest'));
const avatarSvg = computed(() => multiavatar(displayName.value));
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        class="size-9 rounded-full overflow-hidden ring-2 ring-border hover:ring-primary transition-all focus-visible:outline-none focus-visible:ring-primary"
        :class="{ grayscale: props.grayscale }"
        v-html="avatarSvg"
      />
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" class="w-48">
      <DropdownMenuLabel class="font-semibold">{{ displayName }}</DropdownMenuLabel>

      <template v-if="!auth.isAuthenticated">
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="router.push('/signin')">
          <LogIn class="mr-2 size-4" />
          {{ t('header.loginBtn') }}
        </DropdownMenuItem>
      </template>

      <DropdownMenuSeparator />

      <div class="flex items-center gap-2 px-2 py-1.5 text-sm">
        <Languages class="size-4 shrink-0 text-muted-foreground" />
        <button
          class="transition-colors"
          :class="locale === 'ru' ? 'font-semibold' : 'text-muted-foreground hover:text-foreground'"
          @click="setLanguage('ru')"
        >
          RU
        </button>
        <span class="text-muted-foreground">·</span>
        <button
          class="transition-colors"
          :class="locale === 'en' ? 'font-semibold' : 'text-muted-foreground hover:text-foreground'"
          @click="setLanguage('en')"
        >
          EN
        </button>
      </div>

      <DropdownMenuItem @click="toggleDark()">
        <div class="relative mr-2 size-4 shrink-0">
          <Sun
            class="absolute size-4 transition-all duration-300"
            :class="dark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'"
          />
          <Moon
            class="absolute size-4 transition-all duration-300"
            :class="dark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'"
          />
        </div>
        {{ dark ? t('header.themeLight') : t('header.themeDark') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
