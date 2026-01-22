/**
 * Inventory Categories and Preset Items
 * 
 * Comprehensive inventory categorization for home stock management.
 */

// Main categories
export type InventoryMainCategory = 'cleaning' | 'toiletry' | 'pantry' | 'freezer';

// Subcategories by main category
export const INVENTORY_CATEGORIES = {
    cleaning: {
        label: '🧼 Produits d\'entretien',
        subcategories: {
            general: { label: 'Entretien général', items: ['Liquide vaisselle', 'Éponge vaisselle', 'Tampons récurants', 'Savon multi-usage', 'Désinfectant multi-surface', 'Chiffons microfibres', 'Essuie-tout'] },
            floors: { label: 'Sols & surfaces', items: ['Nettoyant sol', 'Serpillière', 'Balai', 'Pelle + balayette', 'Seau'] },
            bathroom: { label: 'Salle de bain & WC', items: ['Nettoyant WC', 'Brosse WC', 'Détartrant', 'Nettoyant douche', 'Nettoyant miroir/vitres', 'Désodorisant WC'] },
            kitchen: { label: 'Cuisine', items: ['Dégraissant cuisine', 'Nettoyant plaques', 'Nettoyant four', 'Nettoyant réfrigérateur', 'Nettoyant évier'] },
            laundry: { label: 'Linge', items: ['Lessive', 'Adoucissant', 'Détachant', 'Eau de javel', 'Pinces à linge'] },
            misc: { label: 'Divers', items: ['Sacs poubelle (petits)', 'Sacs poubelle (grands)', 'Insecticide', 'Gants ménagers', 'Désodorisant maison'] },
        },
    },
    toiletry: {
        label: '🪥 Hygiène & soins',
        subcategories: {
            daily: { label: 'Hygiène quotidienne', items: ['Savon de toilette', 'Gel douche', 'Shampooing', 'Après-shampooing', 'Dentifrice', 'Brosses à dents', 'Fil dentaire', 'Bain de bouche'] },
            body: { label: 'Soins corporels', items: ['Crème hydratante', 'Huile corporelle', 'Déodorant', 'Vaseline', 'Crème mains', 'Crème pieds'] },
            face: { label: 'Soins visage', items: ['Nettoyant visage', 'Crème visage', 'Lait démaquillant', 'Tonique', 'Lingettes démaquillantes'] },
            feminine: { label: 'Hygiène féminine', items: ['Serviettes hygiéniques', 'Protège-slips', 'Tampons'] },
            shaving: { label: 'Rasage & coiffure', items: ['Rasoirs', 'Mousse à raser', 'Peigne', 'Brosse à cheveux', 'Élastiques/pinces', 'Huile cheveux'] },
            baby: { label: 'Bébé/enfants', items: ['Lingettes bébé', 'Savon bébé', 'Crème change', 'Couches'] },
        },
    },
    pantry: {
        label: '🥫 Épicerie / Réserve',
        subcategories: {
            cereals: { label: '🌾 Céréales & féculents', items: ['Riz blanc', 'Riz parfumé', 'Pâtes', 'Semoule', 'Couscous', 'Farine', 'Maïs', 'Flocons d\'avoine', 'Chapelure', 'Spaghetti', 'Vermicelles'] },
            legumes: { label: '🫘 Légumineuses', items: ['Haricots secs', 'Lentilles', 'Pois chiches', 'Pois cassés', 'Fèves sèches', 'Soja', 'Arachides crues', 'Arachides grillées'] },
            spices: { label: '🧂 Condiments & épices', items: ['Sel', 'Poivre', 'Piment', 'Ail en poudre', 'Oignon en poudre', 'Gingembre', 'Curry', 'Paprika', 'Laurier', 'Thym', 'Bouillon cube', 'Moutarde', 'Vinaigre'] },
            oils: { label: '🫙 Huiles & sauces', items: ['Huile végétale', 'Huile d\'arachide', 'Huile d\'olive', 'Sauce tomate', 'Concentré de tomate', 'Ketchup', 'Mayonnaise', 'Sauce soja', 'Sauce piquante'] },
            sweets: { label: '🍯 Sucrants & pâtisserie', items: ['Sucre blanc', 'Sucre roux', 'Sucre glace', 'Miel', 'Confiture', 'Chocolat en poudre', 'Cacao', 'Lait concentré', 'Lait en poudre', 'Levure chimique', 'Levure boulangère', 'Vanille', 'Bicarbonate'] },
            snacks: { label: '🥜 Fruits secs & snacks', items: ['Raisins secs', 'Dattes', 'Noix', 'Amandes', 'Cacahuètes', 'Biscuits secs', 'Crackers', 'Chips'] },
            canned: { label: '🥫 Conserves', items: ['Thon en conserve', 'Sardines', 'Maïs en boîte', 'Petits pois', 'Haricots en conserve', 'Tomates pelées', 'Légumes en conserve', 'Lait évaporé'] },
            drinks: { label: '🥤 Boissons & petit-déj', items: ['Café', 'Thé', 'Chocolat à boire', 'Jus en brique', 'Sirop'] },
            misc: { label: '🧂 Divers essentiels', items: ['Sel de table', 'Sel fin', 'Sel gros', 'Vinaigre blanc', 'Cube d\'assaisonnement', 'Papier aluminium', 'Film alimentaire'] },
        },
    },
    freezer: {
        label: '❄️ Congélateur',
        subcategories: {
            meat: { label: '🥩 Viandes', items: ['Bœuf morceaux', 'Bœuf haché', 'Mouton/agneau', 'Poulet entier', 'Poulet découpé', 'Dinde', 'Saucisses', 'Lard/bacon', 'Viande marinée'] },
            seafood: { label: '🐟 Poissons & fruits de mer', items: ['Poisson entier', 'Filets de poisson', 'Crevettes', 'Calamars', 'Crabe', 'Poisson fumé'] },
            processed: { label: '🍗 Produits transformés', items: ['Nuggets', 'Steaks hachés', 'Brochettes', 'Boulettes de viande', 'Cordons bleus', 'Burgers'] },
            bread: { label: '🍞 Pains & pâtes', items: ['Pain', 'Pain de mie', 'Baguette', 'Pâte à pizza', 'Pâte brisée', 'Pâte feuilletée', 'Pâte sablée'] },
            dairy: { label: '🧀 Produits laitiers', items: ['Beurre', 'Margarine', 'Fromage râpé', 'Fromage en portions', 'Crème fraîche'] },
            vegetables: { label: '🥦 Légumes congelés', items: ['Épinards', 'Haricots verts', 'Petits pois', 'Carottes', 'Maïs', 'Mélange de légumes', 'Oignons découpés', 'Poivrons découpés'] },
            fruits: { label: '🍓 Fruits congelés', items: ['Mangue', 'Fraise', 'Banane', 'Ananas', 'Fruits rouges', 'Pulpe de fruit'] },
            readyToCook: { label: '🍟 Produits prêts à cuire', items: ['Frites', 'Pommes de terre précuites', 'Alloco pré-cuit', 'Pastels', 'Samoussas', 'Beignets'] },
            desserts: { label: '🍰 Pâtisserie & desserts', items: ['Gâteaux maison', 'Cakes tranchés', 'Pâtes à biscuits', 'Crèmes pâtissières', 'Ganaches', 'Glaces', 'Sorbets'] },
            misc: { label: '🧊 Divers', items: ['Glaçons', 'Bouillons congelés', 'Sauce tomate maison', 'Purées', 'Herbes aromatiques'] },
        },
    },
} as const;

// Get flat list of all categories for dropdown
export function getAllCategories(): Array<{ value: string; label: string; mainCategory: InventoryMainCategory }> {
    const result: Array<{ value: string; label: string; mainCategory: InventoryMainCategory }> = [];

    for (const [mainKey, mainCat] of Object.entries(INVENTORY_CATEGORIES)) {
        for (const [subKey, subCat] of Object.entries(mainCat.subcategories)) {
            result.push({
                value: `${mainKey}:${subKey}`,
                label: `${mainCat.label.split(' ')[0]} ${subCat.label}`,
                mainCategory: mainKey as InventoryMainCategory,
            });
        }
    }

    return result;
}

// Get preset items for a category
export function getPresetItems(categoryValue: string): string[] {
    const [main, sub] = categoryValue.split(':');
    const mainCat = INVENTORY_CATEGORIES[main as InventoryMainCategory];
    if (!mainCat) return [];

    const subCat = mainCat.subcategories[sub as keyof typeof mainCat.subcategories];
    if (!subCat) return [];

    return [...subCat.items];
}

// Get main category label
export function getMainCategoryLabel(mainCategory: InventoryMainCategory): string {
    return INVENTORY_CATEGORIES[mainCategory]?.label ?? mainCategory;
}

// Get category label from value
export function getCategoryLabel(categoryValue: string): string {
    const [main, sub] = categoryValue.split(':');
    const mainCat = INVENTORY_CATEGORIES[main as InventoryMainCategory];
    if (!mainCat) return categoryValue;

    const subCat = mainCat.subcategories[sub as keyof typeof mainCat.subcategories];
    if (!subCat) return mainCat.label;

    return subCat.label;
}

// Location options for where items are stored
export const STORAGE_LOCATIONS = {
    frigo: '❄️ Réfrigérateur',
    congelateur: '🧊 Congélateur',
    placard_cuisine: '🚪 Placard cuisine',
    garde_manger: '🥫 Garde-manger',
    salle_de_bain: '🚿 Salle de bain',
    buanderie: '🧺 Buanderie',
    garage: '🏠 Garage',
    autre: '📍 Autre',
} as const;

export type StorageLocation = keyof typeof STORAGE_LOCATIONS;
