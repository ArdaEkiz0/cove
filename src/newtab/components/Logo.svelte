<script lang="ts">
  interface Props {
    size?: number;
  }
  let { size = 28 }: Props = $props();
</script>

<img
  src="/icons/cove.svg"
  width={size}
  height={size}
  alt=""
  aria-hidden="true"
  draggable="false"
  class="cove-logo"
/>

<style>
  .cove-logo {
    display: block;
    flex-shrink: 0;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
  }
</style>
