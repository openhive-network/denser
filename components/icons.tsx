import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Copy,
  CreditCard,
  File,
  FileText,
  HelpCircle,
  Image,
  Laptop,
  Loader2,
  LucideProps,
  Moon,
  MoreVertical,
  Pizza,
  Plus,
  Settings,
  SunMedium,
  Trash,
  Twitter,
  User,
  X,
  type Icon as LucideIcon,
  Forward,
  ArrowUpCircle,
  ArrowBigUp,
  ArrowBigDown,
  ArrowDownCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Search,
  MoreHorizontal,
  LayoutList,
  LayoutGrid,
  Youtube,
  CalendarHeart,
  MapPin,
  Globe2,
  Instagram,
  UserPlus,
  Trash2,
  AtSign,
  CalendarClock,
  Star,
  Circle,
  DollarSign,
  MicOff,
  SidebarClose,
  SidebarOpen,
  Pencil,
  Link
} from 'lucide-react';

export type Icon = LucideIcon;

export const Icons = {
  link: Link,
  pencil: Pencil,
  sidebarClose: SidebarClose,
  sidebarOpen: SidebarOpen,
  x: X,
  micOff: MicOff,
  arrowBigUp: ArrowBigUp,
  arrowBigDown: ArrowBigDown,
  arrowUpCircle: ArrowUpCircle,
  arrowDownCircle: ArrowDownCircle,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  star: Star,
  dollar: DollarSign,
  circle: Circle,
  comment: MessageSquare,
  search: Search,
  forward: Forward,
  moreHorizontal: MoreHorizontal,
  layoutList: LayoutList,
  layoutGrid: LayoutGrid,
  sun: SunMedium,
  moon: Moon,
  laptop: Laptop,
  twitter: Twitter,
  youtube: Youtube,
  calendarHeart: CalendarHeart,
  mapPin: MapPin,
  globe2: Globe2,
  instagram: Instagram,
  userPlus: UserPlus,
  trash: Trash2,
  atSign: AtSign,
  calendarActive: CalendarClock,
  close: X,
  spinner: Loader2,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  post: FileText,
  page: File,
  media: Image,
  settings: Settings,
  billing: CreditCard,
  ellipsis: MoreVertical,
  add: Plus,
  warning: AlertTriangle,
  user: User,
  arrowRight: ArrowRight,
  help: HelpCircle,
  pizza: Pizza,
  check: Check,
  copy: Copy,
  copyDone: ClipboardCheck,
  radix: (props: LucideProps) => (
    <svg viewBox="0 0 25 25" fill="none" {...props}>
      <path d="M12 25C7.58173 25 4 21.4183 4 17C4 12.5817 7.58173 9 12 9V25Z" fill="currentcolor"></path>
      <path d="M12 0H4V8H12V0Z" fill="currentcolor"></path>
      <path
        d="M17 8C19.2091 8 21 6.20914 21 4C21 1.79086 19.2091 0 17 0C14.7909 0 13 1.79086 13 4C13 6.20914 14.7909 8 17 8Z"
        fill="currentcolor"
      ></path>
    </svg>
  ),
  npm: (props: LucideProps) => (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
    </svg>
  ),
  yarn: (props: LucideProps) => (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M12 0C5.375 0 0 5.375 0 12s5.375 12 12 12 12-5.375 12-12S18.625 0 12 0zm.768 4.105c.183 0 .363.053.525.157.125.083.287.185.755 1.154.31-.088.468-.042.551-.019.204.056.366.19.463.375.477.917.542 2.553.334 3.605-.241 1.232-.755 2.029-1.131 2.576.324.329.778.899 1.117 1.825.278.774.31 1.478.273 2.015a5.51 5.51 0 0 0 .602-.329c.593-.366 1.487-.917 2.553-.931.714-.009 1.269.445 1.353 1.103a1.23 1.23 0 0 1-.945 1.362c-.649.158-.95.278-1.821.843-1.232.797-2.539 1.242-3.012 1.39a1.686 1.686 0 0 1-.704.343c-.737.181-3.266.315-3.466.315h-.046c-.783 0-1.214-.241-1.45-.491-.658.329-1.51.19-2.122-.134a1.078 1.078 0 0 1-.58-1.153 1.243 1.243 0 0 1-.153-.195c-.162-.25-.528-.936-.454-1.946.056-.723.556-1.367.88-1.71a5.522 5.522 0 0 1 .408-2.256c.306-.727.885-1.348 1.32-1.737-.32-.537-.644-1.367-.329-2.21.227-.602.412-.936.82-1.08h-.005c.199-.074.389-.153.486-.259a3.418 3.418 0 0 1 2.298-1.103c.037-.093.079-.185.125-.283.31-.658.639-1.029 1.024-1.168a.94.94 0 0 1 .328-.06zm.006.7c-.507.016-1.001 1.519-1.001 1.519s-1.27-.204-2.266.871c-.199.218-.468.334-.746.44-.079.028-.176.023-.417.672-.371.991.625 2.094.625 2.094s-1.186.839-1.626 1.881c-.486 1.144-.338 2.261-.338 2.261s-.843.732-.899 1.487c-.051.663.139 1.2.343 1.515.227.343.51.176.51.176s-.561.653-.037.931c.477.25 1.283.394 1.71-.037.31-.31.371-1.001.486-1.283.028-.065.12.111.209.199.097.093.264.195.264.195s-.755.324-.445 1.066c.102.246.468.403 1.066.398.222-.005 2.664-.139 3.313-.296.375-.088.505-.283.505-.283s1.566-.431 2.998-1.357c.917-.598 1.293-.76 2.034-.936.612-.148.57-1.098-.241-1.084-.839.009-1.575.44-2.196.825-1.163.718-1.742.672-1.742.672l-.018-.032c-.079-.13.371-1.293-.134-2.678-.547-1.515-1.413-1.881-1.344-1.997.297-.5 1.038-1.297 1.334-2.78.176-.899.13-2.377-.269-3.151-.074-.144-.732.241-.732.241s-.616-1.371-.788-1.483a.271.271 0 0 0-.157-.046z" />
    </svg>
  ),
  pnpm: (props: LucideProps) => (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M0 0v7.5h7.5V0zm8.25 0v7.5h7.498V0zm8.25 0v7.5H24V0zM8.25 8.25v7.5h7.498v-7.5zm8.25 0v7.5H24v-7.5zM0 16.5V24h7.5v-7.5zm8.25 0V24h7.498v-7.5zm8.25 0V24H24v-7.5z" />
    </svg>
  ),
  react: (props: LucideProps) => (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z" />
    </svg>
  ),
  tailwind: (props: LucideProps) => (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 C13.666,10.618,15.027,12,18.001,12c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C16.337,6.182,14.976,4.8,12.001,4.8z M6.001,12c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 c1.177,1.194,2.538,2.576,5.512,2.576c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C10.337,13.382,8.976,12,6.001,12z" />
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
        <pattern id="pattern0" patternContentUnits="objectBoundingBox" width="1" height="1">
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
  )
};
