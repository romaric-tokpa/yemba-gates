# 📊 Explication des Relations entre les Tables

## Vue d'ensemble

Votre base de données est organisée en 5 tables principales qui travaillent ensemble pour gérer tout le processus de recrutement. Voici comment elles sont connectées :

## 🔗 Les Relations Principales

### 1. **users → jobs** (Utilisateurs créent des besoins)
- **Relation** : Un utilisateur (recruteur) peut créer plusieurs besoins de recrutement
- **À quoi ça sert** : Savoir qui a créé chaque besoin et qui l'a validé
- **Champs de liaison** : `jobs.created_by` et `jobs.validated_by` pointent vers `users.id`

**Exemple** : Le recruteur "Marie" crée 3 besoins de recrutement. Chacun de ces besoins a son `created_by` qui pointe vers l'ID de Marie.

---

### 2. **users → applications** (Recruteurs attribuent des candidats à des jobs)
- **Relation** : Un recruteur peut attribuer plusieurs candidats à plusieurs jobs
- **À quoi ça sert** : Savoir quel recruteur a attribué un candidat à un job spécifique
- **Champ de liaison** : `applications.created_by` → `users.id`

**Exemple** : Le recruteur "Pierre" attribue le candidat "Jean" au job "Développeur Python". La candidature a `created_by` = ID de Pierre.

---

### 3. **candidates → applications ← jobs** (Candidats postulent à des jobs)
- **Relation** : Un candidat peut postuler à plusieurs jobs, et un job peut recevoir plusieurs candidatures
- **À quoi ça sert** : C'est la table centrale qui lie les candidats aux postes. C'est ici qu'on suit l'avancement d'une candidature spécifique
- **Champs de liaison** : 
  - `applications.candidate_id` → `candidates.id`
  - `applications.job_id` → `jobs.id`

**Exemple** : 
- Le candidat "Jean" postule au job "Développeur Python" → 1 ligne dans `applications`
- Le même candidat "Jean" postule aussi au job "Développeur Java" → 1 autre ligne dans `applications`
- Le job "Développeur Python" reçoit 5 candidatures → 5 lignes dans `applications` avec le même `job_id`

**Pourquoi cette table est importante** : 
- Un candidat peut avoir plusieurs statuts différents selon le job (rejeté pour un poste, mais en shortlist pour un autre)
- On peut suivre l'historique spécifique de chaque candidature
- On peut calculer des statistiques par job ou par candidat
- On sait quel recruteur a attribué chaque candidat à chaque job

---

### 4. **applications → interviews** (Chaque candidature peut avoir plusieurs entretiens)
- **Relation** : Une candidature peut avoir plusieurs entretiens (RH, technique, client)
- **À quoi ça sert** : Planifier et suivre tous les entretiens pour une candidature donnée
- **Champ de liaison** : `interviews.application_id` → `applications.id`

**Exemple** : 
- La candidature de "Jean" pour "Développeur Python" peut avoir :
  - 1 entretien RH (le 15 janvier)
  - 1 entretien technique (le 20 janvier)
  - 1 entretien client (le 25 janvier)
- Chaque entretien est une ligne dans `interviews` avec le même `application_id`

**Pourquoi c'est important** : 
- On peut planifier plusieurs types d'entretiens pour la même candidature
- On stocke le feedback de chaque entretien séparément
- On peut calculer le nombre d'entretiens par candidature

---

### 5. **users → interviews** (Utilisateurs mènent des entretiens)
- **Relation** : Un utilisateur peut être l'interviewer (celui qui mène l'entretien)
- **À quoi ça sert** : Savoir qui a mené chaque entretien et qui a planifié l'entretien
- **Champs de liaison** : 
  - `interviews.interviewer_id` → `users.id` (qui mène l'entretien)
  - `interviews.created_by` → `users.id` (qui a planifié l'entretien)

**Exemple** : Le manager "Sophie" mène l'entretien technique de "Jean". L'entretien a `interviewer_id` = ID de Sophie.

---

### 6. **users → candidates** (Recruteurs sourcent des candidats)
- **Relation** : Un recruteur peut sourcer plusieurs candidats
- **À quoi ça sert** : Savoir qui a trouvé/sourcé chaque candidat
- **Champ de liaison** : `candidates.created_by` → `users.id`

**Exemple** : Le recruteur "Pierre" a sourcé 10 candidats. Chacun a son `created_by` qui pointe vers l'ID de Pierre.

---

## 📈 Schéma Visuel des Relations

```
users (Utilisateurs)
  │
  ├──→ jobs (Besoins) [created_by, validated_by]
  │     │
  │     └──→ applications (Candidatures) [job_id, created_by]
  │           │
  │           ├──→ candidates (Candidats) [candidate_id]
  │           │     │
  │           │     └──→ applications (Candidatures) [candidate_id, created_by]
  │           │
  │           └──→ interviews (Entretiens) [application_id]
  │                 │
  │                 └──→ users (Interviewers) [interviewer_id, created_by]
  │
  ├──→ applications (Attribution candidat→job) [created_by]
  │
  └──→ candidates (Candidats sourcés) [created_by]
```

## 🎯 Pourquoi ces Relations sont Essentielles

### **Table `applications` - Le Cœur du Système**
Cette table est **cruciale** car :
- Elle permet à un candidat de postuler à plusieurs jobs avec des statuts différents
- Elle centralise toutes les informations spécifiques à une candidature (shortlist, offre, onboarding)
- Elle permet de calculer les KPI par job ou par candidat

**Sans cette table**, vous ne pourriez pas :
- Suivre un candidat qui postule à plusieurs postes
- Avoir des statuts différents selon le job
- Calculer le nombre de candidatures par poste

### **Table `interviews` - Le Suivi des Entretiens**
Cette table permet :
- De planifier plusieurs entretiens pour la même candidature
- De stocker le feedback de chaque entretien séparément
- De savoir qui a mené chaque entretien
- De calculer le taux de no-show (candidats absents)

### **Tables d'Historique**
Les tables `job_history` et `application_history` permettent :
- De tracer toutes les modifications (qui, quand, quoi)
- De respecter l'exigence d'historisation complète
- De comprendre l'évolution d'un besoin ou d'une candidature

## 💡 Exemple Concret de Parcours Complet

1. **Création du besoin** : 
   - Recruteur "Marie" crée un job "Développeur Python" → `jobs` (created_by = ID de Marie)

2. **Validation** : 
   - Manager "Sophie" valide le besoin → `jobs` (validated_by = ID de Sophie, status = 'validé')

3. **Sourcing** : 
   - Recruteur "Pierre" source le candidat "Jean" → `candidates` (created_by = ID de Pierre)

4. **Candidature** : 
   - Recruteur "Pierre" attribue "Jean" au job "Développeur Python" → `applications` (candidate_id = ID de Jean, job_id = ID du job, created_by = ID de Pierre)

5. **Entretiens** : 
   - Entretien RH planifié → `interviews` (application_id = ID de la candidature, type = 'rh')
   - Entretien technique planifié → `interviews` (application_id = même ID, type = 'technique')

6. **Shortlist** : 
   - "Jean" est mis en shortlist → `applications` (is_in_shortlist = TRUE, status = 'shortlist')

7. **Offre** : 
   - Offre envoyée à "Jean" → `applications` (offer_sent_at = date, status = 'offre')
   - "Jean" accepte → `applications` (offer_accepted = TRUE, status = 'embauché')

## ✅ Résumé des Relations Clés

1. **`users`** : Qui fait quoi (recruteurs, managers, clients)
2. **`jobs`** : Quels sont les besoins de recrutement
3. **`candidates`** : Qui sont les candidats
4. **`applications`** : **Le lien central** entre candidats et jobs (qui postule à quoi, et qui a attribué)
5. **`interviews`** : Les entretiens pour chaque candidature

**Les relations importantes** :
- **users → jobs** : Les recruteurs créent les besoins
- **users → candidates** : Les recruteurs sourcent les candidats
- **users → applications** : Les recruteurs attribuent les candidats aux jobs
- **candidates ↔ applications ↔ jobs** : Le cœur du système (qui postule à quoi)
- **applications → interviews** : Chaque candidature peut avoir plusieurs entretiens

**La clé** : La table `applications` est le pivot qui permet à un candidat d'avoir plusieurs candidatures avec des statuts différents selon le job, et on sait toujours quel recruteur a fait l'attribution.

