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
      <div className={styles.actions}>
        <button className={styles.ctaButton} type="button" onClick={onAddClick}>
          Share a rosemary spot
        </button>
      </div>
    </header>
  );
}
