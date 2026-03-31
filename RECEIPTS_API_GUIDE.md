# Guide d'Intégration des Reçus GSI (pour APK)

Ce document explique comment le site GSI SmartPay enregistre les reçus et comment vous pouvez les récupérer pour les afficher dans une application mobile (APK).

## 1. Comment les Reçus sont Enregistrés

Chaque fois qu'un agent enregistre un paiement sur le site, une nouvelle entrée est créée dans la collection **`paiements`** de la base de données.

### Structure d'un Reçu (JSON)
Voici à quoi ressemble une donnée de paiement dans la base :
```json
{
  "reference": "REC-ANT-123456",
  "etudiantId": "ID_UNIQUE_DE_L_ELEVE",
  "etudiantNom": "Nom de l'élève",
  "matricule": "24-GSI-001",
  "campus": "Antsirabe",
  "filiere": "Informatique",
  "classe": "L1",
  "montant": 150000,
  "date": "2025-05-15",
  "mode": "Especes",
  "agentNom": "Nom de l'agent",
  "note": "Mai 2025"
}
```

## 2. Comment Récupérer les Reçus pour votre APK

Pour afficher les reçus dans votre APK, vous devez interroger la collection `paiements`.

### A. Récupérer tous les reçus d'un élève par son Matricule
Si votre APK connaît le matricule de l'élève, vous pouvez filtrer la liste des paiements :

**Endpoint :** `GET /api/db/paiements`
**Logique de filtrage (dans votre APK) :**
```javascript
// Exemple en JS/Dart
const tousLesPaiements = await fetch('URL_API/paiements');
const recusDeLélève = tousLesPaiements.filter(p => p.matricule === '24-GSI-001');
```

### B. Affichage du Reçu Numérique
Dans votre APK, vous pouvez créer une interface qui reprend ces informations :
1.  **En-tête** : Affichez la `reference` (ex: REC-ANT-123456).
2.  **Détails** : Affichez le `montant`, la `date` et la `note` (qui contient souvent le mois payé).
3.  **Validation** : Affichez "Validé par " + `agentNom`.

## 3. Lien avec les Écolages
Si vous voulez savoir combien il reste à payer pour l'élève dans l'APK, vous devez consulter la collection **`ecolage`**.
-   `montantDu` : Somme totale à payer pour l'année.
-   `montantPaye` : Somme déjà versée (somme de tous les reçus).
-   `statut` : "paye", "en_attente", ou "impaye".

---
**Conseil pour la Sécurité :**
Ne connectez pas l'APK directement à l'URL secrète de la base de données. Utilisez un petit script PHP ou Node.js intermédiaire sur votre serveur qui demande le matricule et ne renvoie que les reçus de cet élève précis.
