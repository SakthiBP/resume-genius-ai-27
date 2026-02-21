interface SwimLogoProps {
  className?: string;
  size?: number;
}

const SwimLogo = ({ className = "", size = 28 }: SwimLogoProps) => {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.65}
        height={size * 0.55}
        viewBox="0 0 22 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1 3.5C3.5 1 5.5 1.5 7.5 3.5C9.5 5.5 11.5 5 14 3C16.5 1 18.5 1.5 21 3.5"
          stroke="#000000"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M1 8.5C4 6 6 7 8 8.5C10 10 12 9.5 14.5 7.5C17 5.5 19 6.5 21 8.5"
          stroke="#000000"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M1 13.5C3 11 5.5 11.5 7 13C8.5 14.5 11 14 13.5 12C16 10 18.5 11 21 13.5"
          stroke="#000000"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default SwimLogo;
