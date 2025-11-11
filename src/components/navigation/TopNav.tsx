import styles from "@/components/navigation/TopNav.module.css";

export default function TopNav() {
  return (
    <header className={styles.root}>
      <div className={styles.logoGroup}>
        <span className={styles.logoMark}>🌿</span>
        <span className={styles.logoText}>Rosemary Maps</span>
      </div>
      <button className={styles.searchPill} type="button">
        <span className={styles.searchPrimary}>Near me</span>
        <span className={styles.searchDivider} />
        <span className={styles.searchSecondary}>Public gardens</span>
        <span className={styles.searchDivider} />
        <span className={styles.searchHint}>Add rosemary</span>
        <span className={styles.searchIcon}>🔍</span>
      </button>
      <div className={styles.actions}>
        <button className={styles.actionLink} type="button">
          Share a plant
        </button>
        <button className={styles.iconButton} type="button" aria-label="Change language">
          🌐
        </button>
        <button className={styles.profileButton} type="button" aria-label="Account menu">
          <span className={styles.menuIcon}>☰</span>
          <span className={styles.userAvatar}>🙂</span>
        </button>
      </div>
    </header>
  );
}
