CAHIER DES CHARGES FONCTIONNEL
Application Web & Mobile – Suivi du Recrutement en Temps Réel
1️⃣ Contexte & Objectifs
1.1 Contexte
Dans un environnement où le recrutement doit être rapide, traçable et orienté résultats, les outils actuels sont souvent :
trop complexes
peu adaptés au mobile
pauvres en KPI exploitables
Ce projet vise à créer une application web et mobile permettant le pilotage en temps réel de l’ensemble du processus de recrutement, du recueil du besoin jusqu’à l’onboarding chez le client final.
1.2 Objectifs du projet
Centraliser toutes les données de recrutement
Améliorer la visibilité pour les managers et clients
Réduire les délais de recrutement
Mesurer la performance via des KPI temps réel
Structurer et professionnaliser le processus

2️⃣ Périmètre fonctionnel
Le périmètre couvre :
Le recrutement permanent et temporaire
Les recrutements internes et pour clients externes
L’ensemble du cycle de recrutement
❌ Hors périmètre (phase 1) :
Paie
Gestion administrative RH complète
Évaluation annuelle

3️⃣ Utilisateurs & Droits
Profil
Droits principaux
Recruteur
Gestion des besoins, candidats, entretiens
Manager
Suivi KPI, validation, pilotage
Client
Consultation, validation shortlist
Administrateur
Paramétrage, utilisateurs, sécurité

4️⃣ Fonctionnalités détaillées
4.1 Gestion des besoins de recrutement
Fonctionnalités
Création d’un besoin de recrutement
Champs obligatoires :
Intitulé du poste
Département / Client
Type de contrat
Budget
Urgence
Upload de fiche de poste
Workflow de validation
Historique des modifications
Statut du besoin (Brouillon / Validé / En cours / Clôturé)
Règles de gestion
Aucun sourcing possible sans validation du besoin
Toute modification est tracée

4.2 Gestion des candidats
Fonctionnalités
Création d’une fiche candidat
Import CV (PDF, Word)
Tags & mots-clés
Historique des candidatures
Statut du candidat :
Sourcé
Qualifié
Entretien RH
Entretien Client
Shortlist
Offre
Rejeté
Embauché
Règles de gestion
Un candidat peut être associé à plusieurs besoins
Les doublons sont détectés automatiquement
4.3 Sourcing & Pipeline de recrutement
Fonctionnalités
Vue pipeline (kanban)
Changement de statut par glisser-déposer
Source du candidat (LinkedIn, cooptation, job board, etc.)
Commentaires internes
Historique des actions
4.4 Gestion des entretiens
Fonctionnalités
Planification des entretiens
Types d’entretien (RH, technique, client)
Grille d’évaluation standardisée
Notes et feedback obligatoires
Décision post-entretien
Règles
Impossible de passer à l’étape suivante sans feedback

4.5 Shortlist & validation client
Fonctionnalités
Création d’une shortlist
Partage sécurisé avec le client
Commentaires client
Validation ou rejet
4.6 Offre & Onboarding
Fonctionnalités
Suivi des offres envoyées
Statut de l’offre
Checklist onboarding
Confirmation prise de poste
4.7 Dashboard & KPI (Temps réel)
KPIs standards
Time to hire
Time to fill
Nombre de recrutements par recruteur
Taux d’acceptation d’offre
Taux de no-show
Performance par source
Fonctionnalités
Filtres (période, recruteur, client)
Graphiques dynamiques

5️⃣ Notifications & alertes
Notifications email & push :
Validation requise
Retard sur un poste
Entretien planifié
Offre acceptée/refusée
6️⃣ Exigences techniques (fonctionnelles)
Application web responsive
Application mobile (Android & iOS)
Accès sécurisé (authentification)
Sauvegarde automatique des données
Historisation complète

7️⃣ Sécurité & conformité
Gestion des rôles et permissions
Journal des connexions
Confidentialité des données candidats
Accès client restreint

🔁 1. Workflow GLOBAL du recrutement (vue macro)
flowchart LR
A[Recueil du besoin] --> B[Validation manager/client]
B -->|Validé| C[Sourcing candidats]
B -->|Refusé| A
C --> D[Qualification RH]
D -->|OK| E[Entretiens]
D -->|Non| X[Rejet candidat]
E --> F[Shortlist]
F --> G[Décision client]
G -->|Accepté| H[Offre]
G -->|Refusé| C
H -->|Acceptée| I[Onboarding]
H -->|Refusée| C
I --> J[Clôture du poste]

🎯 Lecture simple :
Pas de validation = pas de sourcing.
Pas de feedback = pas d’avancement.
La vérité circule, le bullshit meurt.
📝 2. Workflow – Recueil & validation du besoin
flowchart TD
A[Création besoin] --> B[Complétion champs obligatoires]
B --> C[Soumission pour validation]
C -->|Validé| D[Besoin actif]
C -->|Demande modification| B
C -->|Refusé| A

📌 Règle d’or :
Un besoin flou = recrutement raté
Donc le système bloque. Oui, volontairement.

🔍 3. Workflow – Sourcing & pipeline candidat
flowchart LR
A[Candidat sourcé] --> B[Pré-qualification]
B -->|Qualifié| C[Entretien RH]
B -->|Non qualifié| X[Rejet]
C -->|OK| D[Entretien technique / client]
C -->|KO| X
D -->|OK| E[Shortlist]
D -->|KO| X

🎯 Ici, chaque étape nettoie le pipe.
Moins de CV, plus de qualité. À l’ancienne, mais efficace.
🗣️ 4. Workflow – Gestion des entretiens
flowchart TD
A[Planification entretien] --> B[Entretien réalisé]
B --> C[Saisie feedback obligatoire]
C -->|Avis positif| D[Étape suivante]
C -->|Avis négatif| X[Rejet candidat]

⚠️ Règle non négociable :
Pas de feedback = pas de suite.
Le silence radio n’est pas une option.
📂 5. Workflow – Shortlist & décision client
flowchart TD
A[Création shortlist] --> B[Partage client]
B --> C[Analyse client]
C -->|Validé| D[Préparation offre]
C -->|Refusé| E[Retour sourcing]
E --> A

💡 Le client voit, commente, décide.
Tout est tracé. Les excuses disparaissent.
💼 6. Workflow – Offre & onboarding
flowchart TD
A[Envoi offre] --> B[Réponse candidat]
B -->|Acceptée| C[Onboarding]
B -->|Refusée| D[Retour sourcing]
C --> E[Prise de poste]
E --> F[Clôture recrutement]

🎯 Ici on mesure la vérité terrain :
no-show
refus d’offre
délais réels
📊 7. Workflow – Mise à jour des KPI (temps réel)
flowchart LR
A[Action utilisateur] --> B[Mise à jour statut]
B --> C[Calcul KPI]
C --> D[Dashboard temps réel]


Eran d’accueil / Dashboard manager
Objectif : Vision globale des KPI et activités en temps réel.
+------------------------------------------------+
| Header : Logo | Nom manager | Notifications 🔔 |
+------------------------------------------------+
| KPI : Time to Hire       | Time to Fill       |
| KPI : Nombre recrutements| Taux d'acceptation|
+------------------------------------------------+
| Recrutements en cours (liste/kanban)          |
| Poste | Statut | Candidat clé | Deadlines    |
+------------------------------------------------+
| Bouton : Créer un besoin | Filtrer | Export    |
+------------------------------------------------+


2️⃣ Écran création / suivi d’un besoin
+------------------------------------------------+
| Header : Retour | Nouveau besoin               |
+------------------------------------------------+
| Intitulé poste : [___________]                |
| Département : [dropdown]                       |
| Type contrat : [dropdown]                      |
| Compétences clés : [tags]                     |
| Budget : [___] | Urgence : [dropdown]         |
+------------------------------------------------+
| Statut : Brouillon / Validé / En cours        |
| Historique modifications                      |
+------------------------------------------------+
| Bouton : Soumettre pour validation            |
+------------------------------------------------+


3️⃣ Écran pipeline candidat (Kanban)
Colonnes : Sourcé → Qualifié → Entretien → Shortlist → Offre → Rejet → Embauché
+------------------------------------------------+
| Header : Poste / Filtre / Ajouter candidat     |
+------------------------------------------------+
| [Sourcé]   [Qualifié]   [Entretien]   ...     |
| Candidat1  Candidat4  Candidat7              |
| Candidat2  Candidat5  Candidat8              |
+------------------------------------------------+
| Drag & Drop pour changer de statut            |
| Cliquer candidat → fiche détaillée            |
+------------------------------------------------+


4️⃣ Écran fiche candidat
+------------------------------------------------+
| Header : Retour | Candidat X                   |
+------------------------------------------------+
| Photo / CV / Infos générales                  |
| Tags compétences / Expérience / Source        |
+------------------------------------------------+
| Statut actuel : [dropdown]                     |
| Historique statut / actions                   |
+------------------------------------------------+
| Notes RH | Notes client | Feedback entretien  |
+------------------------------------------------+
| Bouton : Envoyer feedback | Planifier entretien|
+------------------------------------------------+


5️⃣ Écran planification entretien
+------------------------------------------------+
| Header : Retour | Planifier entretien          |
+------------------------------------------------+
| Candidat : X                                   |
| Type entretien : [RH / Technique / Client]    |
| Date & heure : [picker]                        |
| Lieu / Lien visioconf : [_________]           |
| Notes préparation : [textarea]                |
+------------------------------------------------+
| Bouton : Confirmer / Annuler                  |
+------------------------------------------------+


6️⃣ Écran shortlists & validation client
+------------------------------------------------+
| Header : Retour | Shortlist Poste X           |
+------------------------------------------------+
| Liste candidats shortlists                     |
| Nom | Compétences clés | Score | Feedback      |
+------------------------------------------------+
| Actions client : Valider / Rejeter / Commenter|
+------------------------------------------------+


7️⃣ Écran Offre & Onboarding
+------------------------------------------------+
| Header : Retour | Offre & Onboarding          |
+------------------------------------------------+
| Candidat : X                                   |
| Statut offre : Envoyée / Acceptée / Refusée  |
| Checklist Onboarding :                        |
| - Contrat signé [ ]                            |
| - Équipement prêt [ ]                          |
| - Formation prévue [ ]                          |
+------------------------------------------------+
| Bouton : Clôturer recrutement                 |
+------------------------------------------------+


8️⃣ Écran notifications
+------------------------------------------------+
| Header : Retour | Notifications 🔔             |
+------------------------------------------------+
| - Entretien planifié (Candidat X)            |
| - Besoin validé (Poste Y)                     |
| - Offre acceptée/refusée                       |
| - KPI dépassement seuil                        |
+------------------------------------------------+


💡 Tips UX / Design :
Mobile-first → web adapte le layout
Couleurs pour statut uniquement (rouge / vert / orange)
KPIs en graphique simple (barres / camemberts)
Drag & drop pipeline pour fluidité
Feedback obligatoire avant changement statut


User Stories – Application de suivi du recrutement

1️⃣ Module : Gestion du besoin de recrutement
ID
User Story
Critères d’acceptation
US01
En tant que recruteur, je veux créer un besoin de recrutement avec tous les champs obligatoires pour que le sourcing puisse commencer.
Tous les champs obligatoires remplis, possibilité de sauvegarder en brouillon et soumettre pour validation.
US02
En tant que manager, je veux valider ou rejeter un besoin pour que seul un brief clair déclenche le sourcing.
Notification au recruteur, statut mis à jour, historique des décisions.
US03
En tant que recruteur, je veux voir l’historique des modifications d’un besoin pour suivre les changements.
Historique complet avec date, utilisateur et modification.


2️⃣ Module : Gestion des candidats
ID
User Story
Critères d’acceptation
US04
En tant que recruteur, je veux créer une fiche candidat avec CV et tags pour centraliser toutes les infos.
Upload PDF/Word, ajout de tags, source du candidat.
US05
En tant que recruteur, je veux changer le statut du candidat dans le pipeline pour refléter son avancement.
Glisser-déposer possible ou dropdown, mise à jour KPI temps réel.
US06
En tant que recruteur, je veux consulter l’historique d’un candidat pour suivre les interactions.
Historique visible par utilisateur avec dates et actions.
US07
En tant que manager, je veux voir tous les candidats associés à un poste pour suivre le pipeline.
Liste ou vue kanban disponible, filtres par statut.


3️⃣ Module : Entretiens
ID
User Story
Critères d’acceptation
US08
En tant que recruteur, je veux planifier un entretien pour un candidat afin que le processus avance.
Date, type entretien, notes pré-entretien, notifications au candidat et au manager.
US09
En tant que recruteur, je veux saisir un feedback après l’entretien pour que la décision soit traçable.
Feedback obligatoire avant changement de statut.
US10
En tant que manager, je veux consulter les feedbacks pour évaluer le candidat et donner mon avis.
Accès sécurisé aux notes et évaluations.


4️⃣ Module : Shortlist & décision client
ID
User Story
Critères d’acceptation
US11
En tant que recruteur, je veux créer une shortlist pour partager avec le client.
Liste visible par client, ajout/suppression candidats possible.
US12
En tant que client, je veux valider ou rejeter un candidat dans la shortlist pour prendre la décision finale.
Notification au recruteur, mise à jour du statut candidat.
US13
En tant que client, je veux ajouter des commentaires sur les candidats pour que le recruteur comprenne le feedback.
Commentaires tracés et visibles par recruteur et manager.


5️⃣ Module : Offre & onboarding
ID
User Story
Critères d’acceptation
US14
En tant que recruteur, je veux envoyer une offre au candidat pour formaliser le recrutement.
Statut offre : envoyée, acceptée, refusée. Notification candidate.
US15
En tant que recruteur, je veux suivre la checklist onboarding pour m’assurer que le candidat est prêt à intégrer.
Checklist avec cases à cocher, date de prise de poste.
US16
En tant que manager, je veux voir les offres et onboarding en cours pour suivre le pipeline.
Dashboard KPI mis à jour en temps réel.


6️⃣ Module : Dashboard & KPI
ID
User Story
Critères d’acceptation
US17
En tant que manager, je veux voir les KPI temps réel (Time to Hire, Taux d’acceptation, etc.) pour piloter les recrutements.
Graphiques dynamiques, filtres par poste, recruteur, période.
US18
En tant que recruteur, je veux voir mes performances pour savoir où je dois m’améliorer.
KPIs personnels visibles, comparaison avec moyenne équipe.
US19
En tant que manager, je veux recevoir des alertes en cas de retard ou KPI critique pour réagir rapidement.
Notifications email et push configurables.


7️⃣ Module : Notifications
ID
User Story
Critères d’acceptation
US20
En tant qu’utilisateur, je veux recevoir des notifications pour les actions importantes (validation, entretien, offre) pour ne rien oublier.
Notifications en temps réel, visibles sur mobile et web.
US21
En tant que manager, je veux pouvoir configurer quelles notifications je reçois pour éviter le spam.
Paramétrage simple par utilisateur.




📊 Tableau KPI – Dashboard Manager
Catégorie
KPI
Définition
Formule / Méthode de calcul
Filtrage recommandé
Temps & Process
Time to Hire
Délai total entre recueil besoin et embauche
Date embauche - Date recueil besoin
Par poste, recruteur, client
Temps & Process
Time to Fill
Délai entre ouverture poste et acceptation offre
Date acceptation offre - Date ouverture poste
Par poste, recruteur, client
Temps & Process
Cycle moyen par étape
Durée moyenne par étape du pipeline
Moyenne (Date fin étape - Date début étape)
Par poste, recruteur, étape
Temps & Process
Délai moyen feedback
Temps moyen de retour manager/client
Moyenne (Date feedback - Date demande feedback)
Par recruteur, poste, étape
Temps & Process
% postes respectant délai
% de postes clôturés dans le délai cible
(Nb postes dans délai / Nb postes totaux) x100
Par client, recruteur
Qualité & Sélection
Taux candidats qualifiés
% candidats passant préqualification
(Nb qualifiés / Nb candidats sourcés) x100
Par source, poste
Qualité & Sélection
Taux de rejet par étape
% candidats rejetés à chaque étape
(Nb rejetés / Nb candidats à l’étape) x100
Par étape, recruteur
Qualité & Sélection
% shortlist acceptée
% de shortlist validée par le client
(Nb shortlist validée / Nb shortlist envoyée) x100
Par client, poste
Qualité & Sélection
Score moyen candidat
Moyenne des notes des candidats
Somme des scores / Nb candidats évalués
Par poste, recruteur
Qualité & Sélection
Taux no-show entretien
% candidats absents aux entretiens
(Nb absents / Nb entretiens prévus) x100
Par étape, recruteur
Qualité & Sélection
Taux turnover post-onboarding
% candidats quittant le poste dans les X mois
(Nb départs / Nb embauches) x100
Par client, poste
Volume & Productivité
Nb candidats sourcés
Total candidats sourcés
Comptage candidats
Par recruteur, source, poste
Volume & Productivité
Nb CV traités
Total CV examinés
Comptage candidats examinés
Par recruteur, période
Volume & Productivité
Nb recrutements clos vs ouverts
Recrutements finalisés vs en cours
Nb clos / Nb ouverts
Par client, recruteur
Volume & Productivité
Nb entretiens réalisés
Total entretiens effectués
Comptage entretiens
Par recruteur, poste, période
Coût / Budget
Coût moyen recrutement
Moyenne coût par recrutement
Somme coûts / Nb recrutements
Par poste, source
Coût / Budget
Coût par source
Coût moyen par canal de sourcing
Somme coûts source / Nb recrutements source
Par source, poste
Coût / Budget
Budget dépensé vs prévu
Suivi budget recrutement
(Budget dépensé / Budget prévu) x100
Par client, poste
Engagement & Satisfaction
Taux acceptation offre
% candidats acceptant l’offre
(Nb acceptations / Nb offres envoyées) x100
Par poste, recruteur
Engagement & Satisfaction
Taux refus offre
% candidats refusant l’offre
(Nb refus / Nb offres envoyées) x100
Par poste, recruteur
Engagement & Satisfaction
Taux réponse candidat
% candidats répondant aux messages
(Nb réponses / Nb messages envoyés) x100
Par source, recruteur
Recruteur / Performance
Nb postes gérés
Nombre de postes actifs par recruteur
Comptage postes
Par recruteur
Recruteur / Performance
Taux réussite recruteur
% candidats embauchés vs shortlist
(Nb embauches / Nb shortlist) x100
Par recruteur, client
Recruteur / Performance
Temps moyen par étape
Délai moyen par étape par recruteur
Moyenne (Date fin - Date début)
Par recruteur, étape
Recruteur / Performance
Feedbacks fournis à temps
% feedbacks envoyés dans délai
(Nb feedbacks à temps / Nb feedbacks totaux) x100
Par recruteur, étape
Source & Canal
Performance par source
% embauches par source
(Nb embauches source / Nb candidats source) x100
Par source, poste
Source & Canal
Taux conversion par source
% candidats sourcés → embauche
(Nb embauches / Nb candidats sourcés) x100
Par source, poste
Source & Canal
Temps moyen sourcing
Durée moyenne sourcing par canal
Moyenne (Date fin sourcing - Date début)
Par source, recruteur
Onboarding
Taux réussite onboarding
% candidats intégrés selon checklist
(Nb onboardings complets / Nb embauches) x100
Par poste, recruteur
Onboarding
Délai moyen onboarding
Durée moyenne du début onboarding à prise de poste
Moyenne (Date prise poste - Date début onboarding)
Par poste, client
Onboarding
Nb problèmes post-intégration
Nombre d’incidents détectés après intégration
Comptage incidents
Par poste, recruteur


💡 Conseils dashboard :
Afficher les KPIs critiques en haut, avec code couleur rouge/orange/vert.
Graphiques dynamiques (barres, lignes, camemberts) pour les tendances.
Filtrage rapide par recruteur, client, poste, période, source.
Possibilité d’export PDF/Excel pour reporting manager / direction.



📊 Tableau KPI – Dashboard Recruteur
Catégorie
KPI
Définition
Formule / Méthode de calcul
Filtrage recommandé
Volume & Productivité
Nombre de postes gérés
Total de postes actifs suivis par le recruteur
Comptage postes actifs assignés
Par période, client, type de poste
Volume & Productivité
Nombre de candidats sourcés
Total candidats ajoutés au pipeline par le recruteur
Comptage candidats sourcés
Par période, source, poste
Volume & Productivité
Nombre de CV traités
Total candidats examinés / qualifiés
Comptage candidats examinés
Par période, source, poste
Volume & Productivité
Nombre d’entretiens planifiés et réalisés
Total entretiens planifiés et effectués
Comptage entretiens
Par période, type entretien, poste
Volume & Productivité
Nombre de feedbacks envoyés
Nombre de retours donnés aux candidats ou managers
Comptage feedbacks
Par période, étape, poste
Qualité & Sélection
Taux de candidats qualifiés
% de candidats passant la préqualification
(Nb qualifiés / Nb candidats sourcés) x100
Par source, poste, période
Qualité & Sélection
Taux de rejet par étape
% de candidats éliminés à chaque étape
(Nb rejetés à l’étape / Nb candidats à l’étape) x100
Par étape, poste, période
Qualité & Sélection
Taux shortlist acceptée
% de candidats shortlistés validés par le client
(Nb shortlist validée / Nb shortlist envoyée) x100
Par client, poste, période
Qualité & Sélection
Score moyen des candidats
Moyenne des notes attribuées aux candidats
Somme des scores / Nb candidats évalués
Par poste, étape, période
Qualité & Sélection
Taux no-show entretien
% candidats absents aux entretiens
(Nb absents / Nb entretiens prévus) x100
Par étape, poste, période
Temps & Process
Temps moyen par étape
Durée moyenne de chaque étape du pipeline
Moyenne(Date fin étape - Date début étape)
Par étape, poste, période
Temps & Process
Time to hire moyen
Durée moyenne pour boucler un recrutement complet
Moyenne(Date embauche - Date recueil besoin)
Par poste, client, période
Temps & Process
Délai moyen feedback
Temps moyen pour envoyer un feedback candidat/manager
Moyenne(Date feedback - Date demande feedback)
Par étape, poste, période
Engagement & Conversion
Taux d’acceptation d’offre
% offres acceptées par les candidats
(Nb acceptations / Nb offres envoyées) x100
Par poste, client, période
Engagement & Conversion
Taux de refus d’offre
% offres refusées par les candidats
(Nb refus / Nb offres envoyées) x100
Par poste, client, période
Engagement & Conversion
Taux de réponse candidat
% candidats répondant aux sollicitations
(Nb réponses / Nb messages envoyés) x100
Par source, poste, période
Source & Canal
Performance par source
% embauches provenant de chaque canal
(Nb embauches source / Nb candidats sourcés source) x100
Par source, poste, période
Source & Canal
Taux de conversion par source
% candidats sourcés → embauchés par source
(Nb embauches / Nb candidats sourcés) x100
Par source, poste, période
Source & Canal
Temps moyen sourcing par canal
Durée moyenne pour sourcer un candidat par source
Moyenne(Date fin sourcing - Date début sourcing)
Par source, poste, période
Onboarding
Taux réussite onboarding
% candidats intégrés selon checklist complète
(Nb onboardings complets / Nb embauches) x100
Par poste, client, période
Onboarding
Nombre de problèmes post-intégration
Nb incidents détectés après intégration
Comptage incidents
Par poste, client, période
Onboarding
Taux de turnover post-placement
% candidats quittant le poste dans X mois
(Nb départs / Nb embauches) x100
Par poste, client, période


💡 Notes pour intégration web/mobile
Top KPIs : Time to hire, candidats sourcés, taux shortlist acceptée
Graphiques recommandés : barre (volume), lignes (tendance), camembert (répartition source)
Filtres dynamiques : période, poste, client, source, étape
Alertes / notifications : postes en retard, feedback manquant, offres refusées

