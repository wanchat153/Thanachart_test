/**
 * พื้นหลังตกแต่ง: aurora (radial-gradient สองก้อน) + noise overlay
 *
 * ทั้งคู่เป็น `position: fixed; z-index: -1` จึงอยู่หลัง content เสมอและไม่รับ pointer
 * noise มีไว้กัน banding ของ gradient — เอาออกแล้วจะเห็นวงแหวนสีบนจอ 8-bit
 * (สูตรจริงอยู่ใน globals.css คลาส .aurora / .noise)
 */
export function Aurora() {
  return (
    <>
      <div className="aurora" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />
    </>
  );
}
