# Cloud (Supabase) setup — sirf ek dafa, ~10 minute

Is ke baad aap aur Muzammal dono kisi bhi phone/computer se **ek hi khata** dekh aur badal sakte hain.

## 1. Supabase project banayen
1. https://supabase.com par free account banayen → **New project** (naam kuch bhi, region `Singapore` ya `Mumbai`).
2. Project ban jaye to **Project Settings → API** kholen. Wahan 2 cheezein milengi:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** key (lambi si)

## 2. Database table banayen
1. Left menu **SQL Editor → New query**.
2. [supabase-setup.sql](supabase-setup.sql) ka poora text paste karein.
3. Us mein `MOHSAN_EMAIL@example.com` aur `MUZAMMAL_EMAIL@example.com` ko **apni aur Muzammal ki asal email** se badal dein (har jagah, total 3 policies mein).
4. **Run** dabayein.

## 3. Dono ke account banayen (login)
1. **Authentication → Users → Add user → Create new user**
2. Apni email + password likhein, **"Auto Confirm User"** ON rakhein. Phir Muzammal ka bhi isi tarah.
3. **Authentication → Sign In / Providers → Email**: **"Allow new users to sign up"** ko **OFF** kar dein, taake koi aur account na bana sake.

## 4. Site mein key daalen
[index.html](../index.html) mein ye 2 line dhoondein (`SUPABASE_URL`) aur apni values bharein:

```js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'yahan anon public key';
```

Phir file ko Vercel par dobara deploy karein.

## 5. Pehli dafa kholne par
- Login ka dabba aayega → apni email/password.
- Agar cloud khali hai to is browser ka mojooda data khud cloud mein chala jata hai.
- Dusre partner ke login ke baad wo wohi khata dekhega.

## Kaam kaise karta hai
- Har tabdeeli ~1 second baad khud cloud mein save hoti hai (upar patti mein "کلاؤڈ میں محفوظ ✓").
- Dusre partner ne kuch badla to aap ko peeli patti dikhti hai: "تازہ ڈیٹا لوڈ کریں".
- Agar dono ek hi waqt badlen to jis ne pehle save kiya wo bachta hai, doosre ko patti aati hai (koi chupke se overwrite nahi hota).
- Internet chala jaye to site isi browser ke data par chalti rehti hai aur net aate hi dobara save karne ki koshish karti hai.

## Zaroori
- `anon public` key chhupane wali nahi hoti (code mein rehti hai). Hifazat **email list wali policy + login** se hoti hai. **`service_role` key kabhi is file mein na daalen.**
- Supabase free plan 1 hafta se zyada koi activity na ho to project pause kar sakta hai (dashboard se ek click mein dobara chalu hota hai).
