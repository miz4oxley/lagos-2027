# Lagos 2027 · Family Trip Planner

A personal phone app for planning our June 2027 family trip to Lagos. It has:

- **Spots**: save fashion brands, Adire makers, restaurants and places from Instagram. Paste the link, add a screenshot, then put it on a trip day.
- **Plan**: a day-by-day schedule from landing to flying home (hotel → Airbnb, shopping day, photo shoot, reunion…). You can export it to your phone calendar.
- **To-do**: tasks and things to buy in the US. Deadlines count back from landing day, so they move when the dates change.
- **Vendors**: photographer, cook, driver, Adire tailor, hotel, Airbnb and shipper, with WhatsApp and call buttons.
- **Reunion & Adire**: guest list by family side, RSVPs, and a count of the matching outfits and sizes needed.
- **Cargo**: boxes, contents, weight, tracking number and status.
- **Budget**: costs in dollars and naira, converted with your own exchange rate.

It works offline. Out of the box everything saves on the phone you use. Follow step 3 to share one plan between your phone and Adunni's.

---

## 1. Put it on GitHub Pages (5 minutes)

1. Make a new repository on GitHub, e.g. `lagos-2027`. It can be **public**, because your data is not stored in the repo.
2. Upload all the files in this folder, including the `icons` folder and `.nojekyll`.
3. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, then **main** / **(root)**, and click **Save**.
4. After about a minute the app is live at `https://YOUR-USERNAME.github.io/lagos-2027/`.

## 2. Install it on your phones

- **iPhone:** open the link in **Safari**, then tap **Share → Add to Home Screen**.
- **Android:** open the link in **Chrome**, then tap **⋮ → Install app**. You can then use Share in Instagram and pick **Lagos 2027** to send a link straight into the app.

**Saving something from Instagram:** tap ••• or Share on the post, then **Copy link**. In the app, tap **📋 Paste a link**. It guesses the name from the handle. Add a screenshot if you like.

## 3. Turn on sharing with Adunni (free, about 10 minutes)

The app uses Google Firebase's free plan to keep both phones in sync.

1. Go to <https://console.firebase.google.com>, click **Create a project** and name it `lagos-2027`. You can turn Analytics off.
2. **Build → Authentication → Get started → Email/Password → Enable → Save.**
3. **Build → Firestore Database → Create database.** Pick a location near you and start in **production mode**.
4. Open the **Rules** tab and paste in the contents of `firestore.rules`. Put **your email and Adunni's email** in place of the two placeholders, then click **Publish**.
5. Go to **Project settings (⚙) → Your apps → Web (`</>`)** and register the app. Firebase shows a `firebaseConfig = { … }` block. Copy it.
6. On GitHub, open `firebase-config.js`, click ✏️ edit, and replace `null` with that `{ … }` block. Commit.
7. Open the app on each phone and go to **More → Settings → Share with Adunni → Create account**. Use the same emails you put in the rules. After that, you just sign in.

If you'd already added things before sharing was on, tap **Copy this phone's offline plan into the shared plan** once.

## Good to know
- **Backup:** More → Settings → Export backup saves everything to a file.
- **Screenshots** are shrunk to about 100 KB each, so you can save hundreds.
- **After editing the code**, change `VERSION` in `sw.js` so phones pick up the new version.
- **Dates:** the starter dates (June 14, 21 days) are placeholders. Change them in Settings and every day and deadline moves with them.
