import {
  ArrowBigDown,
  ArrowBigUp,
  ChevronDown,
  Laptop,
  LucideProps,
  MessageSquare,
  Moon,
  Share2,
  SunMedium,
  Twitter,
  Youtube,
  type Icon as LucideIcon, Search,
} from 'lucide-react';

export type Icon = LucideIcon

export const Icons = {
  arrowBigUp: ArrowBigUp,
  arrowBigDown: ArrowBigDown,
  chevronDown: ChevronDown,
  comment: MessageSquare,
  search: Search,
  share: Share2,
  sun: SunMedium,
  moon: Moon,
  laptop: Laptop,
  twitter: Twitter,
  youtube: Youtube,
  logo: (props: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 1-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 0 0 4.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 0 0 2.466-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 0 0-2.499-.523A33.119 33.119 0 0 0 11.573 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 0 1 .237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 0 1 .233-.296c.096-.05.13-.054.5-.054z" />
    </svg>
  ),
  hive: (props: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 190" {...props}>
      <g fill="#E31337">
        <path d="M157.272625,107.263942 C157.998992,107.263942 158.45262,108.051463 158.088736,108.68075 L111.33839,189.528945 C111.169808,189.820485 110.858795,190 110.522279,190 L81.9443812,190 C81.2180145,190 80.764386,189.212478 81.1282705,188.583191 L127.878616,107.734996 C128.047199,107.443456 128.358211,107.263942 128.694727,107.263942 L157.272625,107.263942 Z M129.477721,84.0901367 C129.141205,84.0901367 128.830192,83.9106218 128.66161,83.6190818 L81.1282705,1.41680884 C80.764386,0.787521511 81.2180145,0 81.9443812,0 L110.522279,0 C110.858795,0 111.169808,0.179514873 111.33839,0.471054898 L158.87173,82.6733278 C159.235614,83.3026152 158.781986,84.0901367 158.055619,84.0901367 L129.477721,84.0901367 Z" />
        <path d="M135.128406 1.41635199C134.76385.787064228 135.218932 0 135.947343 0L164.565951 0C164.903712 0 165.215845.179714185 165.384888.47151174L219.873006 94.5275799C220.042331 94.8198642 220.042331 95.1801358 219.873006 95.4724201L165.384888 189.528488C165.215845 189.820286 164.903712 190 164.565951 190L135.947343 190C135.218932 190 134.76385 189.212936 135.128406 188.583648L189.342845 95 135.128406 1.41635199zM111.870216 94.5240823C112.042446 94.816752 112.043313 95.1785591 111.872487 95.4720377L57.1252257 189.528106C56.7599958 190.155572 55.8478414 190.157723 55.4796094 189.531986L.129783614 95.4759177C-.0424457704 95.183248-.0433125021 94.8214409.127512727 94.5279623L54.8747743.471894257C55.2400042-.15557243 56.1521586-.157723129 56.5203906.468014185L111.870216 94.5240823z" />
      </g>
    </svg>
  ),
  hivesigner: (props: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 24" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.5181 12.8104V8.40678H0V0H19.5551V4.20339H17.5181V2.1017H2.03699V6.30509H19.5551V13.1461C19.5222 16.4877 17.7094 19.2287 14.7113 21.4096C13.6523 22.1799 12.5164 22.8251 11.3777 23.3509C10.9764 23.5363 10.6021 23.6938 10.2646 23.824C10.0566 23.9043 9.89029 23.9633 9.81615 23.9872L9.77647 24L9.73683 23.987C9.65379 23.9599 9.49659 23.904 9.28912 23.8239C8.95157 23.6936 8.5775 23.5361 8.17627 23.3508C7.03774 22.8249 5.90204 22.1797 4.8433 21.4095C1.87387 19.2492 0.0675382 16.5395 0.00185503 13.2407H0V10.5085H2.03699V12.8104C2.03699 15.3441 3.32072 17.4635 5.52281 19.1962C6.33598 19.8361 7.23142 20.3875 8.15979 20.8533C8.77526 21.1622 9.32941 21.3967 9.77782 21.5599C10.2257 21.3969 10.7802 21.1623 11.3957 20.8534C12.324 20.3876 13.2194 19.8362 14.0326 19.1963C16.2346 17.4635 17.5181 15.3441 17.5181 12.8104V12.8104Z"
        fill="#E31337"
      />
    </svg>
  ),
  hiveauth: (props: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 166 165" {...props}>
      <rect x="0.5" width="165" height="165" fill="url(#pattern0)" />
      <defs>
        <pattern
          id="pattern0"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use xlinkHref="#image0_21_27547" transform="scale(0.00606061)" />
        </pattern>
        <image
          id="image0_21_27547"
          width="165"
          height="165"
          xlinkHref="data:image/png;base64,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"
        />
      </defs>
    </svg>
  ),
}
