# stageAPP - Application de Pilotage de Roue Connectée

Ce projet a été réalisé par Léna JOSSO dans le cadre du BTS CIEL en stage

---

## Objectif du Projet
L'objectif de cette application mobile (développée avec React Native et TypeScript) est de permettre à des forains et exploitants de casinos de piloter à distance une roue de la fortune lumineuse. Elle intègre également un module autonome de gestion des stocks et de gestion des lots directement sur le téléphone.

## Fonctionnement Global

Le projet s'articule autour de trois grands axes fonctionnels :

### 1. Communication et Sécurité (Bluetooth BLE)
L'application communique sans fil avec un microcontrôleur ESP32 intégré dans la roue physique. Pour sécuriser l'accès, l'utilisateur doit saisir un code PIN qui est traité et encodé par l'application avant d'être envoyé à la roue pour valider la connexion. De plus, l'application retient la dernière roue connectée pour éviter de refaire un scan complet à chaque démarrage.

### 2. Interface Visuelle (Roue Dynamique)
Plutôt que d'utiliser des images fixes qui risqueraient de pixeliser selon la taille de l'écran, la roue est dessinée mathématiquement par l'application (en SVG) à l'aide de calculs trigonométriques. Cela permet d'afficher des secteurs de couleur parfaits et de centrer les textes automatiquement, peu importe le modèle de smartphone ou de tablette.

### 3. Gestion de l'Inventaire
L'application intègre un module de gestion des stocks pour l'exploitant. Lorsqu'un nouveau lot est ajouté, si un produit du même type existe déjà, le système fusionne automatiquement les informations et met à jour la quantité globale. Des fenêtres de confirmation sécurisent les actions pour éviter toute suppression accidentelle.
