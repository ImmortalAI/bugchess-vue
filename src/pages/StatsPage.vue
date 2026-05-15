<script setup lang="ts">
import type { RatingDayFinal, RatingExtremes } from '@/api/stats/stats.model';
import { getStatsRatingDayFinal, getStatsRatingExtremes } from '@/api/stats/stats.service';
import type { ChartConfig } from '@/components/ui/chart';
import {
  ChartContainer,
  ChartCrosshair,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/composables/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { VisAxis, VisLine, VisXYContainer } from '@unovis/vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

type RatingChartPoint = {
  date: Date;
  rating: number;
};

const { t, locale } = useTranslation();
const auth = useAuthStore();
const router = useRouter();

const ratingHistory = ref<RatingDayFinal[]>([]);
const ratingExtremes = ref<RatingExtremes | null>(null);
const isStatsLoading = ref(true);
const isStatsError = ref(false);

const chartConfig = computed(
  () =>
    ({
      rating: {
        label: t('stats.ratingLabel'),
        color: 'var(--chart-1)',
      },
    }) satisfies ChartConfig,
);

const rating = computed(() => Math.round(auth.user?.rating ?? 0));
const sigma = computed(() => Math.round(auth.user?.sigma ?? 0));

const ratingChartData = computed<RatingChartPoint[]>(() =>
  ratingHistory.value
    .map((item) => ({
      date: new Date(item.date),
      rating: Math.round(item.rating),
    }))
    .sort((left, right) => left.date.getTime() - right.date.getTime()),
);

const minRating = computed(() => {
  const minimum = ratingExtremes.value?.minimum.rating;
  return minimum === undefined ? null : Math.round(minimum);
});

const maxRating = computed(() => {
  const maximum = ratingExtremes.value?.maximum.rating;
  return maximum === undefined ? null : Math.round(maximum);
});

const ratingDomain = computed<[number, number] | undefined>(() => {
  if (ratingChartData.value.length === 0) return undefined;

  const ratings = ratingChartData.value.map((item) => item.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);

  if (min === max) return [Math.max(0, min - 100), max + 100];

  const padding = Math.max(10, Math.round((max - min) * 0.1));
  return [Math.max(0, min - padding), max + padding];
});

const formatRating = (value: number | null) => value?.toLocaleString() ?? '-';

const formatShortDate = (value: number | Date) =>
  new Date(value).toLocaleDateString(locale.value, {
    month: 'short',
    day: 'numeric',
  });

const formatFullDate = (value: number | Date) =>
  new Date(value).toLocaleDateString(locale.value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatDateParam = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const loadRatingStats = async () => {
  isStatsLoading.value = true;
  isStatsError.value = false;

  const d = new Date();
  d.setDate(d.getDate() - 30);

  const ratingHistoryRange = {
    date_from: formatDateParam(d),
    date_to: formatDateParam(new Date()),
  };

  try {
    const [extremes, dailyRatings] = await Promise.all([
      getStatsRatingExtremes(),
      getStatsRatingDayFinal(ratingHistoryRange),
    ]);

    ratingExtremes.value = extremes;
    ratingHistory.value = dailyRatings;
  } catch {
    isStatsError.value = true;
  } finally {
    isStatsLoading.value = false;
  }
};

onMounted(async () => {
  const result = await auth.refresh();
  if (!result.isOk) {
    await router.push('/signin');
    return;
  }

  await loadRatingStats();
});
</script>

<template>
  <div class="w-full h-full overflow-y-auto flex items-start justify-center px-4 py-8">
    <div class="w-full max-w-5xl flex flex-col gap-4">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            {{ t('stats.ratingLabel') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span
            class="text-7xl font-black tracking-tight bg-linear-to-br from-primary to-primary/50 bg-clip-text text-transparent"
          >
            {{ rating }}
          </span>
          <span class="ml-12">sigma {{ sigma }}</span>
        </CardContent>
      </Card>

      <Card class="py-4 sm:py-0">
        <CardHeader class="flex flex-col items-stretch border-b p-0! sm:flex-row">
          <div class="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
            <CardTitle>{{ t('stats.ratingChartTitle') }}</CardTitle>
            <CardDescription>{{ t('stats.ratingChartDescription') }}</CardDescription>
          </div>

          <div class="flex">
            <div
              class="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
            >
              <span class="text-muted-foreground text-xs">
                {{ t('stats.ratingMax') }}
              </span>
              <span class="text-lg leading-none font-bold sm:text-3xl">
                {{ formatRating(maxRating) }}
              </span>
            </div>
            <div
              class="flex flex-1 flex-col justify-center gap-1 border-t border-l px-6 py-4 text-left sm:border-t-0 sm:px-8 sm:py-6"
            >
              <span class="text-muted-foreground text-xs">
                {{ t('stats.ratingMin') }}
              </span>
              <span class="text-lg leading-none font-bold sm:text-3xl">
                {{ formatRating(minRating) }}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent class="px-2 sm:p-6">
          <div
            v-if="isStatsLoading"
            class="text-muted-foreground flex h-62 items-center justify-center text-sm"
          >
            {{ t('stats.ratingStatsLoading') }}
          </div>
          <div
            v-else-if="isStatsError"
            class="text-muted-foreground flex h-62 items-center justify-center text-sm"
          >
            {{ t('stats.ratingStatsError') }}
          </div>
          <div
            v-else-if="ratingChartData.length === 0"
            class="text-muted-foreground flex h-62 items-center justify-center text-sm"
          >
            {{ t('stats.ratingHistoryEmpty') }}
          </div>
          <ChartContainer v-else :config="chartConfig" class="aspect-auto h-62 w-full" cursor>
            <VisXYContainer :data="ratingChartData" :y-domain="ratingDomain">
              <VisLine
                :x="(item: RatingChartPoint) => item.date"
                :y="(item: RatingChartPoint) => item.rating"
                :color="chartConfig.rating.color"
              />
              <VisAxis
                type="x"
                :x="(item: RatingChartPoint) => item.date"
                :tick-line="false"
                :domain-line="false"
                :grid-line="false"
                :tick-format="formatShortDate"
              />
              <VisAxis type="y" :num-ticks="3" :tick-line="false" :domain-line="false" />
              <ChartTooltip />
              <ChartCrosshair
                :template="
                  componentToString(chartConfig, ChartTooltipContent, {
                    labelFormatter: formatFullDate,
                  })
                "
                :color="chartConfig.rating.color"
              />
            </VisXYContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
