export const SpriteIcon = ({ name, className = '' }) => (
    <svg className={`icon ${className}`.trim()} aria-hidden="true" focusable="false">
        <use href={`#${name}`} />
    </svg>
);