# Architecte Make IA

Application statique permettant de générer des scénarios Make intégrant une étape d'Intelligence Artificielle. Décrivez une idée en français et l'outil produit:

- Un plan détaillé du scénario (déclencheur, étapes, mappages, gestion des erreurs)
- Un blueprint JSON générique (structure modules + connexions) exportable et adaptable dans Make

## Utilisation

1. Ouvrez `index.html` dans un navigateur moderne, ou déployez sur Vercel
2. Décrivez votre idée (ex: "Quand Typeform est soumis → analyser avec l'IA → ajouter une ligne Google Sheets → notifier Slack")
3. Choisissez le déclencheur et le modèle IA
4. Optionnel: cochez des services pressentis
5. Cliquez "Générer le scénario"
6. Copiez le plan ou téléchargez le JSON

## Détails de génération

- Détection heuristique des services (Typeform, Webhook, Google Sheets, Slack, Gmail, Notion, Calendar)
- Déclencheur par défaut: Webhook, ou Planification si texte contient des indices ("tous les jours", "cron")
- Étape IA: module OpenAI (chat-completion), prompt système + utilisateur, sortie JSON stricte ({ insights[], resume, champSortie })
- Chaînage simple des modules (trigger → normalisation → IA → actions aval → handler erreurs)

## Fichiers

- `index.html` UI (FR)
- `styles.css` thème sombre moderne
- `app.js` logique de génération, copie presse-papiers, export JSON
- `vercel.json` configuration minimale Vercel

## Déploiement (Vercel)

Déployez depuis la racine du projet:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-0116decd
```

L'application est statique (aucune dépendance à installer).

## Licence

MIT
