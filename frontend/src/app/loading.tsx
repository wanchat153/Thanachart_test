/**
 * โครงร่างต้องสูงเท่าการ์ดจริง (thumbnail 16:10 + เนื้อหา) ไม่งั้นหน้าจะกระตุกตอนข้อมูลมาถึง
 */
export default function Loading() {
  return (
    <>
      <div className="mb-10">
        <div className="h-5 w-20 animate-pulse rounded-sm bg-surface-2" />
        <div className="mt-3 h-11 w-64 animate-pulse rounded-sm bg-surface-2" />
        <div className="mt-4 h-5 w-full max-w-prose animate-pulse rounded-sm bg-surface-2" />

        <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border-default bg-border-default sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bg-surface p-5">
              <div className="h-4 w-24 animate-pulse rounded-sm bg-surface-2" />
              <div className="mt-2 h-7 w-32 animate-pulse rounded-sm bg-surface-2" />
            </div>
          ))}
        </div>
      </div>

      {/* ช่องค้นหา — ต้องกันที่ไว้ ไม่งั้น grid เด้งขึ้นลงตอนข้อมูลมาถึง */}
      <div className="mb-6 h-12 animate-pulse rounded-md bg-surface-2 sm:max-w-xl" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-border-default bg-surface"
          >
            <div className="aspect-[16/10] animate-pulse bg-surface-2" />

            <div className="p-5">
              <div className="h-4 w-12 animate-pulse rounded-sm bg-surface-2" />
              <div className="mt-2 h-6 w-full animate-pulse rounded-sm bg-surface-2" />
              <div className="mt-6 h-8 w-36 animate-pulse rounded-sm bg-surface-2" />
              <div className="mt-6 h-11 w-full animate-pulse rounded-sm bg-surface-2" />
              <div className="mt-2 h-11 w-full animate-pulse rounded-sm bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
