# 🏢 آسان پارٹنرشپ و ایمپلائی کھاتہ سسٹم (System Documentation)

Yeh document is pooray system ki mukammal tafseel, maqsad aur kaam karne ke tareeqay ko wazeh karta hai.

---

## 📌 ۱. یہ سسٹم کیا ہے؟ (What is this system?)

* **ڈیجیٹل منشی / خودکار لیجر:**  
  Yeh ek automated accounting aur settlement engine hai jo mukhtalif partners ke darmian nafa/nuqsan (Profit & Loss) aur mulazmeen (employees) ke payroll, advance aur kharidari ka 100% shafaf (transparent) hisaab rakhta hai.

* **بغیر کسی الجھن کے حتمی فیصلہ:**  
  Aam taur par partners ke darmian confusion hoti hai ke kis partner ne kitna kharch kiya, kis ke paas sale ke kitne paise aaye, aur aakhir mein kis ne kis ko kitne paise dene hain. Yeh system aik single line mein seedha faisla nikal kar deta hai (e.g. *Mohsan Muzammal ko Rs. 34,700 dega*).

---

## ⚙️ ۲. یہ سسٹم کیا کیا کرتا ہے؟ (Core Features)

### ۱. پارٹنرز کا کھاتہ اور شیئر مینجمنٹ (Multi-Partner Management)
* **لامحدود پارٹنرز (Dynamic Partners):**  
  Kal ko koi 3rd, 4th ya naya partner shamil ho, aap `+ نیا پارٹنر شامل کریں` par click kar ke foran add kar sakte hain. System ka formula khud bakhud naye partner ke hisaab se adjust ho jata hai.
* **حسابی تناسب / ریشو (Custom Profit Ratio):**  
  Har partner ka hissa alag set ho sakta hai (maslan 50:50, ya 2:1, ya 40:30:30). Nafa aur nuqsan isi ratio ke tehat taqseem hota hai.
* **آمدنی اور ذاتی جیب سے خرچہ:**  
  * **آمدنی (Income Received):** Karobar ya dukaan ki jo sale is partner ke hath aayi.
  * **ذاتی خرچہ (Personal Expense):** Jo us ne apni zaati jaib se dukaan ya samaan par lagaya (advance ke ilawa).

---

### ۲. ہفتہ وار اور ماہانہ تنخواہ (Weekly & Monthly Payroll)
* **ہفتہ وار / ماہانہ سوئچ (Period Toggle):**  
  Aap apne business ke mutabiq chahein haftay ke haftay (Weekly) hisaab karein ya maheenay ke baad (Monthly), sirf aik click se switch kar sakte hain. Tamam labels aur card headers khud bakhud badal jaate hain.
* **طے شدہ اور نیٹ تنخواہ (Net Salary):**  
  طے شدہ تنخواہ (Gross Salary) se advance kaat kar bachi hui raqam (Net Salary) khud nikal aati hai.
* **تنخواہ ادا کرنے والا پارٹنر (Salary Payer):**  
  Agar kisi partner ne employee ki tankhwah apni jaib se di ho to woh select kiya jata hai taake settlement mein us partner ko uske paise wapis mil sakein.

---

### ۳. ایڈوانس، خریداری اور کیش ٹرانسفر کا کنٹرول (Advances & Cash Flow)
* **الگ الگ پارٹنر کا ایڈوانس:**  
  Mohsan ne kitna advance diya aur Muzammal ne kitna diya, alag alag fields mein darj hota hai.
* **ملازمین کا آپس میں کیش تبادلہ (Inter-Employee Transfers):**  
  Agar aik employee (e.g. Ayaz) ko 2,500 mile, us ne 2,000 ka samaan liya aur 500 doosre employee (e.g. Javed) ko de diye:
  * Ayaz ke card mein `- دوسرے ملازم کو دیا: 500` likhein.
  * Javed ke card mein `+ دوسرے ملازم سے ملا: 500` likhein.
  * Hisaab mein aik rupay ka bhi farq nahi aayega.
* **ایڈوانس کٹوتی کی پالیسی (Advance Deferral):**  
  Agar employee kahe ke *"is dafa meri tankhwah se advance na kato, agli dafa kaat lena"*, to dropdown se:
  * **خودکار کٹوتی (Auto):** Bacha hua advance is hafte ki salary se kaat le.
  * **اگلی تنخواہ میں کٹوتی (Defer to Next):** Is dafa tankhwah poori milegi aur advance agle period par chala jayega.
  * **مرضی کی جزوی کٹوتی (Custom Amount):** Thora amount is dafa kaatna ho aur baqi baad mein.

---

### ۴. خودکار حسابی فارمولا اور حتمی فیصلہ (Settlement Formula)

System ka engine mathematical rules par chalta hai:

$$\text{Total Business Income} = \sum \text{Partner Incomes} + \sum \text{Employee Direct Incomes}$$

$$\text{Total Business Expenses} = \sum \text{Partner Expenses} + \sum \text{Employee Purchases} + \sum \text{Salaries}$$

$$\text{Net Profit / Loss} = \text{Total Income} - \text{Total Expenses}$$

$$\text{Partner Balance} = (\text{Partner Out-of-Pocket Cash} - \text{Partner Income}) + \text{Partner Profit Share}$$

* **حتمی فیصلہ بینر:**  
  Result screen par clear likha aata hai ke kis partner ne kis ko kitne paise dene hain aur employees ke paas jo baqi cash bacha hai woh kis tarah jama hoga.

---

### ۵. ریکارڈز کو محفوظ کرنا اور بیک اپ (History & Backup)
* **محفوظ شدہ پرانے کھاتے (Saved Records Archive):**  
  Haftay ya maheenay ka hisaab khatam hone ke baad **"یہ کھاتہ محفوظ کریں"** dabayein. Tareekh aur title ke sath tamam purana record neeche table mein save rehta hai jise kabhi bhi 1-click se dobara load kiya ja sakta hai.
* **پرنٹ / PDF ایکسپورٹ:**  
  Aap direct Print ya PDF bana kar partners ya employees ko bhej sakte hain.
* **مکمل بیک اپ (JSON Backup/Restore):**  
  Poore data ko file ke roop mein download kar ke hamesha ke liye safe rakha ja sakta hai.

---

## 🌐 لائیو سسٹم لنک (Live Web Application)
* **Website:** [https://partner-calculator-vert.vercel.app/](https://partner-calculator-vert.vercel.app/)
