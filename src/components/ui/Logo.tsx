export default function Logo({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 710 632"
      width={size}
      height={size}
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="lg1" x1="219" y1="132" x2="364" y2="132" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#268CF0" />
          <stop offset="1" stopColor="#24EAD1" />
        </linearGradient>
        <linearGradient id="lg2" x1="0" y1="289" x2="487" y2="289" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#24EAD1" />
          <stop offset="1" stopColor="#268CF0" />
        </linearGradient>
        <linearGradient id="lg3" x1="289" y1="306" x2="670" y2="306" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#24EAD1" />
          <stop offset="1" stopColor="#268CF0" />
        </linearGradient>
        <linearGradient id="lg4" x1="635" y1="156" x2="710" y2="156" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#24EAD1" />
          <stop offset="1" stopColor="#268CF0" />
        </linearGradient>
        <linearGradient id="lg5" x1="603" y1="462" x2="677" y2="462" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#24EAD1" />
          <stop offset="1" stopColor="#268CF0" />
        </linearGradient>
        <linearGradient id="lg6" x1="451" y1="595" x2="525" y2="595" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#24EAD1" />
          <stop offset="1" stopColor="#268CF0" />
        </linearGradient>
        <linearGradient id="lg7" x1="616" y1="210" x2="625" y2="193" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2696ED" />
          <stop offset="0.0431" stopColor="#2696ED" />
          <stop offset="0.5986" stopColor="#269BEB" />
          <stop offset="1" stopColor="#24DFD5" />
        </linearGradient>
      </defs>
      <path fill="url(#lg1)" d="M219.253 72.2974C248.219 78.1481 334.34 103.499 364.573 179.557L347.993 193.207C317.76 117.149 248.219 104.478 219.253 98.6274L219.253 72.2974Z" />
      <path fill="url(#lg2)" d="M62.1371 91.7301C68.9618 65.3992 85.5166 -16.532 176.217 2.97013C266.918 22.4723 218.161 157.041 187.927 284.78C159.084 406.643 234.181 427.784 272.397 435.82C274.22 436.203 274.239 438.76 272.597 439.64C106.441 528.655 -15.7323 484.71 1.64714 391.07C19.2021 296.485 55.3125 118.061 62.1371 91.7301ZM385.967 419.38C486.384 384.243 507.909 482.814 470.847 535.46C433.785 588.107 231.902 580.307 156.827 571.54C81.7522 562.773 48.8894 515.044 40.6971 498.37C118.706 526.645 285.55 454.517 385.967 419.38Z" />
      <path fill="url(#lg3)" d="M588.243 155.876C669.827 126.975 669.833 212.706 669.833 212.706C669.833 212.706 654.225 386.277 646.423 422.356C638.62 458.435 613.358 461.166 602.533 462.336C548.892 459.411 548.215 428.013 547.923 414.556C547.674 403.132 555.579 338.711 557.973 319.516C558.204 317.663 555.983 316.587 554.613 317.856L518.663 351.166C505.984 364.818 492.325 367.746 465.993 367.746C440.345 367.746 420.897 325.009 412.063 304.946C411.663 304.04 410.678 303.586 409.723 303.846L401.903 305.976C401.141 306.184 400.566 306.876 400.443 307.656C395.802 337.014 387.793 362.308 382.183 378.266C379.651 385.468 375.16 391.91 368.913 396.296C310.637 437.211 289.473 383.754 289.473 372.626C289.473 360.925 313.855 247.81 322.633 212.706C331.41 177.602 351.495 167.044 360.673 163.946C434.117 139.156 467.911 212.567 487.153 253.846C487.763 255.156 489.492 255.364 490.443 254.276L555.883 179.386C564.788 169.195 575.485 160.396 588.243 155.876Z" />
      <ellipse cx="301" cy="109" rx="37" ry="37" fill="#25DED6" />
      <ellipse cx="672" cy="156" rx="37" ry="37" fill="url(#lg4)" />
      <ellipse cx="640" cy="462" rx="37" ry="37" fill="url(#lg5)" />
      <ellipse cx="488" cy="595" rx="37" ry="37" fill="url(#lg6)" />
      <path d="M640.91 173.588C640.91 173.588 631.235 176.825 625.188 183.456C619.141 190.086 616.528 201.866 616.528 201.866L625.188 210.525C625.188 210.525 627.802 198.745 633.849 192.115C639.895 185.484 647.737 183.456 647.737 183.456L640.91 173.588Z" fill="url(#lg7)" />
      <path fill="url(#lg1)" d="M466.684 519.307C467.711 518.226 469.514 518.612 470.014 520.018L483.954 559.217C484.283 560.144 483.897 561.177 483.034 561.647L465.134 571.407C464.052 571.998 462.703 571.471 462.294 570.307L450.804 537.607C450.555 536.899 450.717 536.112 451.234 535.568L466.684 519.307Z" />
    </svg>
  );
}
