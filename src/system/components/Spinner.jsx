import { cx } from '../../utils';

export default function Spinner({ size = 16, className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cx('shrink-0 animate-spin', className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
