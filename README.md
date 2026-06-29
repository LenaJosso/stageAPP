# stageAPP - Application de Pilotage de Roue Connectée

Ce projet a été réalisé par Léna JOSSO dans le cadre du BTS CIEL en stage

---

## Objectif du Projet
L'objectif de cette application mobile (développée avec React Native couplé à Expo) est de permettre à des forains et exploitants de casinos de piloter à distance une roue de la fortune lumineuse. Elle intègre également un module autonome de gestion des stocks et de gestion des lots directement sur le téléphone.

## Fonctionnement Global

Le projet s'articule autour de trois grands axes fonctionnels :

### 1. Communication et Sécurité (Bluetooth BLE)
L'application communique sans fil avec un microcontrôleur ESP32 intégré dans la roue physique. Pour sécuriser l'accès, l'utilisateur doit saisir un code PIN qui est traité et encodé par l'application avant d'être envoyé à la roue pour valider la connexion. De plus, l'application retient la dernière roue connectée pour éviter de refaire un scan complet à chaque démarrage.

### 2. Interface Visuelle (Roue Dynamique)
Plutôt que d'utiliser des images fixes qui risqueraient de pixeliser selon la taille de l'écran, la roue est dessinée mathématiquement par l'application (en SVG) à l'aide de calculs trigonométriques. Cela permet d'afficher des secteurs de couleur parfaits et de centrer les textes automatiquement, peu importe le modèle de smartphone ou de tablette.

### 3. Gestion de l'Inventaire
L'application intègre un module de gestion des stocks pour l'exploitant. Lorsqu'un nouveau lot est ajouté, si un produit du même type existe déjà, le système fusionne automatiquement les informations et met à jour la quantité globale. Des fenêtres de confirmation sécurisent les actions pour éviter toute suppression accidentelle.

## Commentaires et notes sur le projet

### 1. Dossier Screen
Il contient tous les screens différents qui seront dans l'application : l'Accueil, La Connexion Bluetooth, l'Ajout de Lot, la Visualisation des stocks, la télécommande des Roues et les Statistiques. Il contient également le "stockContext" qui inclut la défintion des constantes pour ajouter et supprimer des lots.

#### A. Fichier CommandeScreen (le + important) :
Ce fichier est l'écran de contrôle principal. C'est là que le user visualise la roue, interagit avec elle et observe le résultat.

##### A.1 Contruction et géométrie de la roue : 
Le script calcule automatiquement la taille de la roue et des leds en fonction des dimensions de l'écran. Si aucune liste n'est donnée par l'esp32, il génère une roue par défaut. Si la config de la roue indique plusieurs leds par quartier, le fichier utilise des formules trigo pour disposer chaque led au bon endroit. Les leds définit "perdantes" sont coloréss en noir et les autres restent grises.

##### A.2 Gestion des animations  :
Un ecouteur useEffect surveille l'etat bluetooth de la roue. Dès qu'un résultat valide est demandé, une animation de rotation fluide est initialisé. L'animation calcule l'angle exact à atteindre pour que la led demandé tombe pile sous le triangle se trouvant au dessus de la roue. AZ la fin de la rotation, l'appli vérifie si la Led finale est enregistrée dans les perdantes et si c'est le cas elle affiche "Bankrupt", sinon elle affiche le numéro de la case.

##### A.3 Bouton d'interaction et d'action :
L'interface propose plusieurs boutons de commande : la sélection directe (bouton numéroté pour chaque quartier), bouton SPIN (Lance un tirage classique aléatoire), bouton BANKRUPT ( tombe sur une des leds pêrdantes au hasard) et le bouton de Déverrouillage (pour débloquer et permettre l'utilisation de la roue. Ce bouton se reset à chaque tour pour permettre un sécu optimal et éviter toute triche du client).

##### A.4 Afficahge de l'historique : 
En bas de l'écran, un bandeau déroulant horizontal qui affiche l'historique des 20 derniers tirages enregistrés et stockés dans la mémoire flash de l'esp32. Chaque élément est affiche le numéro du tirage, une puce de couleur représentant le quartier et le nom du lot remporté.


### 2. Fichier useesp32.ts
Ce fichier est un hook React personalisé qui centralise toute la logique de communication Bluetooth low energy entre l'app et la roue physique
Il gère :
#### A. Le cycle de connexion :
Gère les scans des périphériques, la connexion et la deconnexion et la mémorisation auto du dernier appareil connecté.

#### B. L'authentificiation sécurisée :
Des la première connexion, il gère la vérification du code PIN de sécurité sur la caractéristique dédiée afin d'autoriser les intéractions.

#### C. Synchronisatoin de la configuration :
Il extrait et décode les informations et paramètres de la Roue données par l'ESP32 (le nombre de case, de leds perdantes, etc...)

#### D. Controle et transmission des ordres :
Il expose les focntions d'actionnement comme spinWheel (pour la rotation) et unlock (pour déverrouiller la roue)

#### E. Ecoute des résultats :
Il s'"abonne" aux notifications bluetooth de l'esp32 pour intercepter le signal d'arrêt, le déclenchement de la rotation etc...

#### F. Récupération des données :
Il récupère l'historique des derniers tirages stockés dans la mémoire flash pour maintenir à jour l'affichage de l'utilisateur, et les statistiques pour aussi les maintenir à jour après chaque tirage.

### 3. Fichier BLE_CONTEXT.tsx :
Ce fichier crée et exporte un Context React (BLEContext) pour partager globalement l'état et les fonctions Bluetooth de la roue
#### A. BleProvider :
C'est le composant "enveloppe" qui encapsule le hook useesp32 et distribue ses données à tous ses composants enfants.

#### B. useBleGlobal :
C'est un hook personnalisé qui permet qui permet à n'importe quel fichier d'accéder aux fonctions de la roue (spinWheel, unlock, etc...) 


### 4. Fichier App.tsx : 
C'est le point d'entrée principal et le coeur de l'appli

#### A. Initialisation de l'affichage : 
Il force le verrouillage de l'écran en portrait pour empêcher l'interface de pivoter si le user tourne son téléphone.

#### B. Architecture : 
Il enveloppe l'ensemble de l'application sous deux injecteurs de données globaux : BleProvider et StockProvider, rendant ces focntionnalités disponibles sur n'importe quel écran.

#### C. Système de navigation : 
Il configure le système de routage de l'application grâce à un gestionnaire d'écrans en pile (Stack). Il dit que HomeScreen sera la page de départ et répertorie les 6 fenêtres naviguables de l'appli.

### 5. Fichier responsive.tsx :
Ce fichier fournit un hook React Native permettant d'adapter dynamiquement l'interface à toutes les tailles d'écrans 

#### A. Ecoute du changement de taille :
Il surveille en temps réel les dimensions du téléphone via un écouteur "Dimensions.addEventListener" 

#### B. Calcul mise à l'échelle : 
Il compare la largeur réelle de l'écran à une largeur par défautr pour calculer un nouveau ratio multiplicateur.

#### C. Outils d'adaptation :
Il exporte les fonctions "fontsize" et "number" pour redimensionner automatiquement les textes, marges et composants graphiques ainsi que les variables "deviceWidth" et "deviceHeight" pour avoir constamment les dimensions de l'appareil.

### 6. Fichier Triangle.tsx et Roue.tsx
Ces deux fichiers sont les calculs/ dessins en SVG (Scalable Vector Graphics, langage conçu pour décrire des graphiques vectoriels permettant d'avoir un rendu très propre sans pixel visible) qui permettent la création visuel d'une Roue et du petit Triangle servant de repère au dessus de la Roue.

### 7. Fichier type.ts
Ce fichier regroupe les définitions de types de l'application afin de sécuriser l'architecture et les données. 
Il définit d'abord la structure Bluetooth (BleContextType) pour partager proprement les fonctions d'interaction avec la roue ESP32 via un contexte React. 
Il configure également le routage de l'application (RootStackParamList) en listant tous les écrans disponibles (Accueil, Stock, Bluetooth, Commande, etc.) pour interdire les erreurs de navigation. Enfin, il modélise la structure d'un Lot et le comportement attendu du gestionnaire de stocks (StockContextType), imposant les fonctions indispensables pour ajouter, supprimer ou décrémenter automatiquement les récompenses à chaque tirage de la roue.


### 8. Fichier GradientText.tsx et globalStyles.ts: 
Ce fichier définit un composant réutilisable permettant d'appliquer un dégradé de couleur sur du texte. Je l'ai utilisé pour les gros titres des screens de l'appli, pour un jolie rendu qui en plus faire un rappel au logo Lémia.
globalStyles quand a lui réprésente tous les styles présent dans l'appli (les tailles,  couleur, marge, etc...). Il a la même fonction qu'un CSS mais écrit en ts.

#### 9. Dossier COMMANDE ROUE

A l'heure actuelle il ne sert à rien, il n'est utilisé nulle part. c'était la première version du projet quand l'esp32 ne donnait pas encore de paramètre de roue. Cependant je le laisse car je pense qu'il peut être utile au cas où certaines erreurs apparaîtrait. Il contient les 4 roues différentes : 20 cases avec Bankrupt, 12 avec Bankrupt, 12 cases simples et enfin la roue BlackJack. 

## Mon avis et potentiel changement a apporté :
Tout d'abord je tiens à vous remerciez de m'avoir confié ce projet de A à Z, c'était vraiment très enrichissant.

Ce projet est une très bonne idée pour l'évolution des télécommandes.

Je pense que dans le useesp32.ts (et aussi dans le code de l'ESP32) il faudrait intégrer les winningLeds, au même titre que les leds perdantes (losingLeds). Cela serait plus pratique en terme de gestion des résultats. Et par conséquent, il faudrait ajouter un bouton Gros Lot. 

