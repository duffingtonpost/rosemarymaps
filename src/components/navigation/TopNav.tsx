import styles from "@/components/navigation/TopNav.module.css";

type TopNavProps = {
  onAddClick: () => void;
};

export default function TopNav({ onAddClick }: TopNavProps) {
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
        <button className={styles.ctaButton} type="button" onClick={onAddClick}>
          Share a rosemary spot
        </button>
      </div>
    </header>
  );
}
