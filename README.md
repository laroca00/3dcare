# 3D Care: Printing a More Inclusive Future

Website and open-source repository of the **3D Care** Erasmus+ Cooperation Partnership in Adult Education (KA220-ADU, 2026–2028).

3D Care develops, tests and openly publishes low-cost 3D-printed assistive and learning tools for adults with disabilities, together with training materials for adult educators and support professionals.

## Partners

- Društvo terapeuta specijalne edukacije i rehabilitacije (Serbia), coordinator
- Srednja škola Ludbreg (Croatia)
- Gölcük Şehit Volkan Tantürk Mesleki ve Teknik Anadolu Lisesi (Türkiye)
- Do-Re-Mi (Latvia)
- Future Focus Ltd (Malta)
- Akgün Yaratıcı Fikirler Derneği (Türkiye)
- Kaunas Social Services Day Centre KORYS (Lithuania)

## Disclaimer

Co-funded by the European Union. Views and opinions expressed are however those of the author(s) only and do not necessarily reflect those of the European Union or the granting authority. Neither the European Union nor the granting authority can be held responsible for them.

## Development

The site is a static Next.js export published with GitHub Pages.

```bash
npm install
npm run dev      # http://localhost:3000/en/
npm run build    # static site in out/
```

- Page text lives in `src/i18n/en.ts` and `src/i18n/tr.ts`.
- Partners and models live in `src/content/`. Model entries marked `template: true` are placeholders until the validated models are published.
- Repository variables used by the deploy workflow: `BASE_PATH` (`/3dcare` while served from github.io, empty on the custom domain) and `WEB3FORMS_KEY` (contact form).

## Licence

Website code: MIT. The licence for the 3D models and guides will be added when the first models are published.
