<script lang="ts">
  interface Props {
    size?: number;
  }
  let { size = 28 }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 64 64"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
  class="cove-logo"
>
  <rect
    x="3"
    y="3"
    width="58"
    height="58"
    rx="15"
    fill="var(--surface-card-solid)"
    stroke="var(--accent)"
    stroke-opacity="0.38"
    stroke-width="2"
  />
  <path
    d="M14.5 23.5C15.8 43 23.8 47 32 48.8C40.2 47 48.2 43 49.5 23.5"
    stroke="var(--accent-text)"
    stroke-width="5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <path
    d="M22.8 33.2C26.5 36.2 37.5 36.2 41.2 33.2"
    stroke="var(--accent)"
    stroke-opacity="0.82"
    stroke-width="3.5"
    stroke-linecap="round"
  />
</svg>
