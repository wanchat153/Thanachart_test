import { config } from "@fortawesome/fontawesome-svg-core";

/**
 * Next.js จัดการ CSS เอง — ต้องปิดการที่ Font Awesome แอบฉีด <style> ตอน runtime
 * ไม่งั้นไอคอนจะกระพริบใหญ่ผิดขนาดหนึ่งเฟรม (flash of huge icons)
 * แล้ว import styles.css เข้ามาเองใน layout แทน
 */
config.autoAddCss = false;

export {
  faBagShopping,
  faCartShopping,
  faCircleExclamation,
  faMinus,
  faMoon,
  faPlus,
  faSun,
  faTrash,
  faTrashCan,
  faCheck,
  faSpinner,
  faBan,
  faDatabase,
  faMagnifyingGlass,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
