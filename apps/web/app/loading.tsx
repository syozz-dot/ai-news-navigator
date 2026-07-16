export default function Loading() {
  return (
    <main className="loadingPage" aria-label="正在加载情报流">
      <div className="loadingHero" />
      <div className="loadingShell">
        <div>
          {[0, 1, 2, 3].map((item) => (
            <div className="loadingRow" key={item}>
              <span />
              <div>
                <i />
                <b />
                <i />
              </div>
            </div>
          ))}
        </div>
        <div className="loadingRail" />
      </div>
    </main>
  );
}
