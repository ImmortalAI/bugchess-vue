<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { ChessError } from '@/utils/chessError';
import ChessPromotion from '@/components/chess/ChessPromotion.vue';
import { cn } from '@/lib/utils';
import type { Config } from '@lichess-org/chessground/config';
import type { Color, Key } from '@lichess-org/chessground/types';
import { Chessground } from '@lichess-org/chessground';
import ChessPockets from './ChessPockets.vue';
import type { PocketData } from '@/api/chess/chess.model';
import ChessBoardResizer from './ChessBoardResizer.vue';

interface ChessBoardProps {
  class?: string;
  classContainer?: string;
  classBoard?: string;
  classPromotion?: string;
  classPockets?: string;
  classPocketRow?: string;
  config?: Config;
  isPromoting: boolean;
  pocketsInteractive?: boolean;
  pocketsOrientation?: 'vertical' | 'horizontal';
  resizable?: boolean;
  /** Pieces available to the player at the bottom of the board. */
  pockets?: PocketData;
  /** Pieces available to the player at the top of the board. */
  pocketsOpponent?: PocketData;
  /** Opponent's last normal move to animate; null/undefined for full FEN reset. */
  opponentMove?: [Key, Key] | null;
}

const props = defineProps<ChessBoardProps>();

const board = ref<HTMLElement | null>(null);
const api = shallowRef<ReturnType<typeof Chessground> | null>(null);

onMounted(() => {
  if (board.value === null) {
    throw new ChessError('Board element not found');
  }

  api.value = Chessground(board.value, props.config);
});

watch(
  () => [props.config, props.opponentMove] as const,
  ([config, opponentMove], [prevConfig]) => {
    if (api.value === null || config === undefined) return;
    const boardSwitched = config.orientation !== prevConfig?.orientation;
    if (opponentMove && !boardSwitched) {
      api.value.move(opponentMove[0], opponentMove[1]);
      api.value.set({ ...config, fen: undefined });
    } else {
      api.value.set(config);
    }
  },
);

onBeforeUnmount(() => {
  if (api.value === null) return;
  api.value.destroy();
});

const onPocketPieceMousedown = (
  piece: keyof PocketData,
  color: Color,
  e: MouseEvent | TouchEvent,
) => {
  if (api.value === null) return;
  api.value.dragNewPiece({ role: piece, color }, e);
};

const emptyPocket: PocketData = { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 };

// The "bottom" player's color matches the board orientation.
const pocketsColor = computed<Color>(() =>
  props.config?.orientation === 'black' ? 'black' : 'white',
);
</script>

<template>
  <!-- Vertical pockets: board on left, pockets column on right -->
  <div
    v-if="pocketsOrientation === 'vertical'"
    :class="cn('relative grid grid-cols-[auto_auto] w-fit', props.class)"
  >
    <div class="relative w-fit h-fit">
      <div :class="cn('relative', props.classBoard)" ref="board"></div>
      <ChessBoardResizer v-if="props.resizable && !props.isPromoting" />
      <ChessPromotion v-if="isPromoting" :class="props.classPromotion" color="white" file="b" />
    </div>
    <ChessPockets
      :class="props.classPockets"
      :color="pocketsColor"
      :data="pockets ?? emptyPocket"
      :data-opponent="pocketsOpponent"
      :interactive="pocketsInteractive"
      @piece-mousedown="onPocketPieceMousedown"
    />
  </div>

  <!-- Horizontal pockets: opponent pocket / board / player pocket stacked vertically -->
  <div
    v-else-if="pocketsOrientation === 'horizontal'"
    :class="cn('flex flex-col gap-1', props.class)"
  >
    <div :class="cn('flex justify-between items-center gap-2', props.classPocketRow)">
      <ChessPockets
        orientation="horizontal"
        :color="pocketsColor === 'white' ? 'black' : 'white'"
        :data="pocketsOpponent ?? emptyPocket"
      />
      <slot name="pocket-top-extra" />
    </div>
    <div :class="cn('relative w-full', props.classContainer)">
      <div :class="cn('relative', props.classBoard)" ref="board"></div>
      <ChessPromotion v-if="isPromoting" :class="props.classPromotion" color="white" file="b" />
    </div>
    <div :class="cn('flex justify-between items-center gap-2', props.classPocketRow)">
      <ChessPockets
        orientation="horizontal"
        :class="props.classPockets"
        :color="pocketsColor"
        :data="pockets ?? emptyPocket"
        :interactive="pocketsInteractive"
        @piece-mousedown="onPocketPieceMousedown"
      />
      <slot name="pocket-bottom-extra" />
    </div>
  </div>

  <!-- No pockets -->
  <div v-else :class="cn('relative w-fit h-fit', props.class)">
    <div :class="cn('relative', props.classBoard)" ref="board"></div>
    <ChessBoardResizer v-if="props.resizable && !props.isPromoting" />
    <ChessPromotion v-if="isPromoting" :class="props.classPromotion" color="white" file="b" />
  </div>
</template>
