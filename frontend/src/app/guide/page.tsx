import type { Metadata } from "next";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBagShopping,
  faBan,
  faCartShopping,
  faCheck,
  faDatabase,
} from "@/lib/icons";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "คู่มือใช้งาน & BRD — Shopping",
  description:
    "เอกสารข้อกำหนดทางธุรกิจ (BRD) และคู่มือการใช้งานระบบร้านค้า: ขอบเขต กฎธุรกิจ ขั้นตอนใช้งาน และการจัดการข้อผิดพลาด",
};

/**
 * หน้านี้เป็นเอกสาร ไม่ใช่ข้อมูลสินค้า — เนื้อหาจึงเขียนตรงในคอมโพเนนต์ได้
 * (กฎ "ข้อมูลต้องมาจาก DB" ใช้กับรายการสินค้า/ราคา/สต๊อก ซึ่งหน้านี้ไม่ได้แสดง)
 *
 * ทุกกฎด้านล่างถอดมาจากโค้ดจริง: Services/CheckoutService.cs, Services/CheckoutResult.cs,
 * Controllers/CheckoutController.cs และ frontend/src/lib/cart.ts
 */
const BUSINESS_RULES = [
  {
    id: "BR-01",
    rule: "ราคาและยอดคงเหลืออ่านจากฐานข้อมูลเสมอ",
    detail:
      "ตอนชำระเงิน ระบบอ่านราคาจากตาราง Product ใหม่ทุกครั้ง ไม่รับราคาที่เบราว์เซอร์ส่งมา ถ้าผู้ใช้แก้ราคาในเครื่องตัวเอง จะไม่มีผลใด ๆ",
  },
  {
    id: "BR-02",
    rule: "ตะกร้าเก็บแค่รหัสสินค้ากับจำนวน",
    detail:
      "ข้อมูลตะกร้าอยู่ในเบราว์เซอร์ (localStorage) และจงใจไม่เก็บราคา เพราะราคาอาจเปลี่ยนหลังผู้ใช้ทิ้งตะกร้าไว้ข้ามวัน",
  },
  {
    id: "BR-03",
    rule: "เปิดหน้าเมื่อไร ระบบปรับตะกร้าให้ตรงสต๊อกล่าสุดทันที",
    detail:
      "ถ้าระหว่างที่ทิ้งตะกร้าไว้มีคนซื้อไปจนสต๊อกลด ระบบจะตัดยอดส่วนเกินออกเอง และแจ้งว่ารายการไหนถูกปรับ ด้วยเหตุผลอะไร",
  },
  {
    id: "BR-04",
    rule: "สั่งซื้อเกินยอดคงเหลือไม่ได้",
    detail:
      "ปุ่มเพิ่มจำนวนจะถูกปิดเมื่อจำนวนในตะกร้าเท่ากับสต๊อกที่มี และสินค้าที่หมดแล้วจะกดใส่ตะกร้าไม่ได้เลย",
  },
  {
    id: "BR-05",
    rule: "หนึ่งบิลห้ามมีรหัสสินค้าซ้ำ",
    detail:
      "ถ้าส่งรหัสเดียวกันมาสองรายการในบิลเดียว ระบบปฏิเสธทั้งบิล (HTTP 400) ต้องรวมเป็นรายการเดียวแล้วเพิ่มจำนวนแทน",
  },
  {
    id: "BR-06",
    rule: "จำนวนสั่งซื้อต้องมากกว่า 0",
    detail: "จำนวนติดลบหรือศูนย์ถูกปฏิเสธตั้งแต่ก่อนแตะฐานข้อมูล (HTTP 400)",
  },
  {
    id: "BR-07",
    rule: "ตัดสต๊อกกับตรวจสอบยอด ทำในคำสั่งเดียว",
    detail:
      "ระบบใช้คำสั่งอัปเดตที่มีเงื่อนไข “หักได้เฉพาะเมื่อของยังพอ” ทำให้สองคำสั่งซื้อที่เข้ามาพร้อมกันไม่สามารถขายของชิ้นเดียวกันซ้ำได้",
  },
  {
    id: "BR-08",
    rule: "ของไม่พอแม้รายการเดียว = ยกเลิกทั้งบิล",
    detail:
      "ระบบไม่ขายบางส่วน จะย้อนธุรกรรมทั้งหมดแล้วตอบกลับ HTTP 409 พร้อมบอกว่าสินค้าตัวไหนเหลือเท่าไร ตะกร้าของผู้ใช้จะไม่ถูกล้าง",
  },
  {
    id: "BR-09",
    rule: "บิลบันทึกราคา ณ เวลาที่สั่งซื้อ",
    detail:
      "ราคาต่อหน่วยในบิลเป็นภาพนิ่ง (snapshot) ถ้าราคาสินค้าเปลี่ยนภายหลัง บิลเก่าจะไม่เปลี่ยนตาม",
  },
  {
    id: "BR-10",
    rule: "ทุกการตัดสต๊อกถูกบันทึกเป็นประวัติ",
    detail:
      "การขายแต่ละครั้งเขียนลงตาราง StockTransaction พร้อมจำนวนที่ติดลบและเลขที่บิลที่อ้างอิงถึง จึงตรวจย้อนหลังได้ว่าของหายไปไหน",
  },
  {
    id: "BR-11",
    rule: "บิลที่สร้างมีสถานะ Paid เสมอ",
    detail:
      "เฟสนี้ถือว่าการกดชำระเงินคือชำระเสร็จสมบูรณ์ ยังไม่มีสถานะรอชำระ ยกเลิก หรือคืนเงิน",
  },
] as const;

const ERROR_CASES = [
  {
    status: "409",
    title: "สินค้าถูกซื้อตัดหน้า",
    cause: "ระหว่างที่กำลังกดชำระเงิน มีคนอื่นซื้อของชิ้นนั้นไปก่อน",
    action:
      "ตะกร้าไม่ถูกล้าง ระบบดึงยอดคงเหลือใหม่ให้อัตโนมัติ — ปรับจำนวนแล้วกดชำระเงินอีกครั้ง",
  },
  {
    status: "404",
    title: "ไม่พบสินค้า",
    cause: "รหัสสินค้าในตะกร้าถูกลบออกจากระบบไปแล้ว",
    action: "ระบบจะนำรายการนั้นออกจากตะกร้าให้เองเมื่อเปิดหน้าใหม่",
  },
  {
    status: "400",
    title: "คำขอไม่ถูกต้อง",
    cause: "ตะกร้าว่าง มีรหัสสินค้าซ้ำ หรือจำนวนไม่มากกว่า 0",
    action: "ตรวจรายการในตะกร้า แล้วลองใหม่",
  },
  {
    status: "—",
    title: "เชื่อมต่อ backend ไม่ได้",
    cause: "backend ไม่ได้รัน รันคนละพอร์ต หรือถูก HTTPS redirect (307) ระหว่างทาง",
    action: "หน้าเว็บจะแสดงสาเหตุจริงพร้อมขั้นตอนตรวจสอบให้ทีมพัฒนา",
  },
] as const;

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-14">
        <p className="text-sm font-medium text-accent">เอกสารประกอบระบบ</p>
        <h1 className="mt-2 text-display font-semibold text-balance text-fg">
          คู่มือใช้งาน &amp; ข้อกำหนดทางธุรกิจ
        </h1>
        <p className="mt-4 max-w-prose text-fg-muted">
          เอกสารนี้อธิบายว่าระบบร้านค้านี้ทำอะไรได้บ้าง ทำงานตามกฎอะไร
          และผู้ใช้ต้องทำอย่างไรทีละขั้น ทุกข้อถอดมาจากพฤติกรรมจริงของระบบ
          ไม่ใช่ข้อกำหนดที่ตั้งใจไว้เฉย ๆ
        </p>
      </header>

      <Section title="1. ระบบนี้ทำอะไร" id="overview">
        <p>
          ระบบร้านค้าออนไลน์ขนาดเล็กที่ให้ลูกค้าดูรายการสินค้าพร้อมยอดคงเหลือจริง
          เลือกจำนวนใส่ตะกร้า แล้วชำระเงิน โดยระบบจะตัดสต๊อก ออกบิล
          และบันทึกประวัติการเคลื่อนไหวของสต๊อก <strong className="font-medium text-fg">
            ภายในธุรกรรมเดียว
          </strong>{" "}
          หากขั้นตอนใดล้มเหลว ทุกอย่างจะถูกย้อนกลับทั้งหมด
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ScopeCard
            icon={faCheck}
            tone="success"
            title="อยู่ในขอบเขต"
            items={[
              "แสดงรายการสินค้า ราคา และยอดคงเหลือจากฐานข้อมูล",
              "ตะกร้าสินค้าที่จำได้แม้ปิดเบราว์เซอร์",
              "ชำระเงินพร้อมตัดสต๊อกและออกบิล",
              "กันการขายเกินเมื่อมีคนซื้อพร้อมกัน",
              "โหมดสว่าง/มืด",
            ]}
          />
          <ScopeCard
            icon={faBan}
            tone="danger"
            title="ยังไม่มีในเฟสนี้"
            items={[
              "ระบบสมาชิก / เข้าสู่ระบบ",
              "หน้าผู้ดูแลระบบ",
              "ประวัติคำสั่งซื้อของลูกค้า",
              "ยกเลิกบิล / คืนสินค้า / คืนเงิน",
              "ระบบรับชำระเงินจริง",
            ]}
          />
        </div>
      </Section>

      <Section title="2. ผู้ใช้งาน" id="users">
        <p>
          ระบบยังไม่มีการเข้าสู่ระบบ ทุกคนที่เปิดเว็บได้คือ{" "}
          <strong className="font-medium text-fg">ลูกค้า</strong> และมีสิทธิ์เท่ากันทั้งหมด
          คือดูสินค้า จัดการตะกร้าของตัวเอง และชำระเงิน
          ตะกร้าของแต่ละคนอยู่ในเบราว์เซอร์ของตัวเอง ไม่แชร์กัน
        </p>
      </Section>

      <Section title="3. วิธีใช้งาน" id="how-to">
        <ol className="space-y-6">
          <Step
            number={1}
            icon={faBagShopping}
            title="เลือกสินค้าและจำนวน"
            body="ที่หน้ารายการสินค้า แต่ละการ์ดบอกยอดคงเหลือจริง ปรับจำนวนด้วยปุ่ม − และ + แล้วกด “ใส่ตะกร้า” ปุ่ม + จะกดไม่ได้เมื่อถึงจำนวนสูงสุดที่มีในสต๊อก"
          />
          <Step
            number={2}
            icon={faCartShopping}
            title="ตรวจตะกร้า"
            body="หน้าตะกร้าแสดงราคาต่อหน่วยล่าสุด จำนวน และยอดรวมทั้งบิล แก้จำนวนหรือลบรายการได้ที่นี่ ถ้าสต๊อกลดลงตั้งแต่ครั้งก่อน ระบบจะปรับจำนวนให้พร้อมแจ้งเหตุผล"
          />
          <Step
            number={3}
            icon={faCheck}
            title="ชำระเงิน"
            body="กดปุ่ม “ชำระเงิน” หนึ่งครั้ง ระบบจะตัดสต๊อก ออกบิล และแสดงใบสรุปพร้อมเลขที่คำสั่งซื้อ กดซ้ำระหว่างรอไม่ทำให้เกิดบิลซ้ำ"
          />
        </ol>
      </Section>

      <Section title="4. กฎธุรกิจ" id="rules">
        <p className="mb-6">
          กฎเหล่านี้บังคับใช้ที่ฝั่งเซิร์ฟเวอร์และฐานข้อมูล
          ไม่ใช่แค่ซ่อนปุ่มในหน้าเว็บ — แก้ที่เบราว์เซอร์แล้วก็ยังผ่านไปไม่ได้
        </p>

        <dl className="divide-y divide-border-default overflow-hidden rounded-lg border border-border-default bg-surface">
          {BUSINESS_RULES.map((rule) => (
            <div key={rule.id} className="p-5">
              <dt className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-accent-soft px-2.5 py-1 font-numeric text-xs font-medium text-accent">
                  {rule.id}
                </span>
                <span className="font-medium text-fg">{rule.rule}</span>
              </dt>
              <dd className="mt-2 text-sm text-fg-muted">{rule.detail}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="5. เมื่อเกิดข้อผิดพลาด" id="errors">
        <div className="overflow-hidden rounded-lg border border-border-default bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-default text-xs text-fg-subtle">
                  <th className="px-5 py-3 font-medium">รหัส</th>
                  <th className="px-5 py-3 font-medium">อาการ</th>
                  <th className="px-5 py-3 font-medium">สาเหตุ</th>
                  <th className="px-5 py-3 font-medium">ต้องทำอย่างไร</th>
                </tr>
              </thead>
              <tbody>
                {ERROR_CASES.map((item) => (
                  <tr
                    key={item.title}
                    className="border-b border-border-default last:border-0 align-top"
                  >
                    <td className="px-5 py-4 font-numeric text-fg-subtle tabular-nums">
                      {item.status}
                    </td>
                    <td className="px-5 py-4 font-medium text-fg">{item.title}</td>
                    <td className="px-5 py-4 text-fg-muted">{item.cause}</td>
                    <td className="px-5 py-4 text-fg-muted">{item.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <div className="mt-14 flex flex-wrap items-center gap-4 rounded-lg border border-border-default bg-accent-soft p-6">
        <FontAwesomeIcon
          icon={faDatabase}
          className="h-5 w-5 shrink-0 text-accent"
          aria-hidden="true"
        />
        <p className="flex-1 text-sm text-fg">
          พร้อมลองใช้งานแล้ว? ราคาและยอดคงเหลือทุกตัวเลขที่เห็นคือของจริงจากฐานข้อมูล
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-sm bg-accent px-5 text-sm font-medium text-accent-fg transition-all hover:bg-accent-hover hover:shadow-accent"
        >
          ไปหน้ารายการสินค้า
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal>
      <section aria-labelledby={id} className="mb-14">
        <h2 id={id} className="mb-4 text-2xl font-semibold text-fg">
          {title}
        </h2>
        {/* ย่อหน้าอ่านง่ายต้องไม่เกิน ~75 ตัวอักษรต่อบรรทัด — ตาราง/การ์ดยังกว้างเต็มที่ */}
        <div className="text-fg-muted [&>p]:max-w-prose">{children}</div>
      </section>
    </Reveal>
  );
}

function ScopeCard({
  icon,
  tone,
  title,
  items,
}: {
  icon: IconDefinition;
  tone: "success" | "danger";
  title: string;
  items: readonly string[];
}) {
  const toneClass =
    tone === "success"
      ? "bg-success-soft text-success"
      : "bg-danger-soft text-danger";

  return (
    <div className="rounded-lg border border-border-default bg-surface p-5">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${toneClass}`}
        >
          <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <h3 className="font-medium text-fg">{title}</h3>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-fg-muted">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true" className="text-fg-subtle">
              •
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  body,
}: {
  number: number;
  icon: IconDefinition;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-5">
      <div className="flex flex-col items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <FontAwesomeIcon icon={icon} className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <div className="flex-1 pt-1">
        <h3 className="font-medium text-fg">
          <span className="font-numeric text-fg-subtle">ขั้นที่ {number} · </span>
          {title}
        </h3>
        <p className="mt-1 text-sm text-fg-muted">{body}</p>
      </div>
    </li>
  );
}
