import styles from "@/components/navigation/TopNav.module.css";

export default function TopNav() {
  return (
    <header className={styles.root}>
      <div className={styles.logoGroup}>
        <span className={styles.logoMark}>RM</span>
        <span className={styles.logoText}>Rosemary Maps</span>
      </div>
    </header>
  );
}
