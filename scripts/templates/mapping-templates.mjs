/**
 * Standard mapping templates for SWADE system documents
 * Based on the current SWADE system field structure
 */

/**
 * Standard mapping templates for different document types
 * These templates define the complete field mapping configuration for Babele translation
 */
export const STANDARD_MAPPING_TEMPLATES = {
    Item: {
        // Universal fields (from itemDescription)
        description: "system.description",
        notes: "system.notes",
        source: "system.source",
        
        // Category field (from category)
        category: "system.category",
        
        // Actions field (from actions)
        actions: {
            path: "system.actions",
            converter: "actions"
        },
        
        // Physical item fields (from physicalItem - applicable to weapon, armor, gear)
        quantity: "system.quantity",
        weight: "system.weight",
        price: "system.price",
        
        // Weapon specific fields (WeaponData)
        damage: "system.damage",
        range: "system.range",
        rof: "system.rof",
        ap: "system.ap",
        parry: "system.parry",
        minStr: "system.minStr",
        shots: "system.shots",
        ammo: "system.ammo",
        reloadType: "system.reloadType",
        
        // Armor specific fields (ArmorData)
        armor: "system.armor",
        toughness: "system.toughness",
        
        // Edge specific fields (EdgeData)
        requirements: {
            path: "system.requirements",
            converter: "requirements"
        },
        
        // Power specific fields (PowerData)
        rank: "system.rank",
        pp: "system.pp",
        duration: "system.duration",
        trapping: "system.trapping",
        arcane: "system.arcane",
        
        // Hindrance specific fields (HindranceData)
        severity: "system.severity",
        major: "system.major",
        
        // Effects field
        effects: {
            path: "effects",
            converter: "effects"
        }
    },
    
    Actor: {
        // Actor details fields (based on SWADE system actor structure)
        biography: "system.details.biography.value",
        appearance: "system.details.appearance",
        notes: "system.details.notes.value",
        goals: "system.details.goals.value",
        
        // Category field
        category: "system.category",
        
        // Embedded content
        items: {
            path: "items",
            converter: "embeddedItems"
        },
        effects: {
            path: "effects",
            converter: "nestedContent"
        }
    },
    
    Scene: {
        // Scene description
        description: "description",
        notes: "notes",
        
        // Navigation name
        navName: "navName"
    },
    
    JournalEntry: {
        // Journal entry content
        name: "name",
        
        // Pages content (for v10+ journals)
        pages: {
            path: "pages",
            converter: "journalPages"
        }
    },
    
    Adventure: {
        // Adventure description
        description: "description",
        caption: "caption",
        
        // Embedded documents
        actors: {
            path: "actors",
            converter: "embeddedDocuments"
        },
        items: {
            path: "items", 
            converter: "embeddedDocuments"
        },
        scenes: {
            path: "scenes",
            converter: "embeddedDocuments"
        },
        journals: {
            path: "journal",
            converter: "embeddedDocuments"
        }
    },
    
    Cards: {
        // Cards description
        description: "description",
        
        // Individual cards
        cards: {
            path: "cards",
            converter: "nestedContent"
        }
    },
    
    Macro: {
        // Macro name and description
        name: "name",
        command: "command"
    },
    
    Playlist: {
        // Playlist description
        description: "description",
        
        // Playlist sounds
        sounds: {
            path: "sounds",
            converter: "nestedContent"
        }
    },
    
    RollTable: {
        // Roll table description
        description: "description",
        
        // Table results
        results: {
            path: "results",
            converter: "tableResults"
        }
    }
};

/**
 * Item type specific mapping templates
 * These extend the base Item template with type-specific fields
 */
export const ITEM_TYPE_SPECIFIC_MAPPINGS = {
    weapon: {
        damage: "system.damage",
        range: "system.range",
        rof: "system.rof",
        ap: "system.ap",
        parry: "system.parry",
        minStr: "system.minStr",
        shots: "system.shots",
        ammo: "system.ammo",
        reloadType: "system.reloadType",
        isHeavyWeapon: "system.isHeavyWeapon"
    },
    armor: {
        minStr: "system.minStr",
        armor: "system.armor",
        toughness: "system.toughness",
        isNaturalArmor: "system.isNaturalArmor",
        isHeavyArmor: "system.isHeavyArmor",
        locations: {
            path: "system.locations",
            converter: "nestedContent"
        }
    },
    edge: {
        requirements: {
            path: "system.requirements",
            converter: "requirements"
        },
        isArcaneBackground: "system.isArcaneBackground"
    },
    hindrance: {
        severity: "system.severity",
        major: "system.major"
    },
    power: {
        rank: "system.rank",
        pp: "system.pp",
        damage: "system.damage",
        range: "system.range",
        duration: "system.duration",
        trapping: "system.trapping",
        arcane: "system.arcane",
        ap: "system.ap",
        innate: "system.innate"
    },
    gear: {
        isAmmo: "system.isAmmo"
    },
    shield: {
        parry: "system.parry",
        cover: "system.cover",
        minStr: "system.minStr"
    },
    skill: {
        attribute: "system.attribute",
        die: "system.die",
        modifier: "system.modifier",
        wild: "system.wild"
    },
    ability: {
        subtype: "system.subtype"
    },
    action: {
        // Actions typically inherit from base item template
    },
    consumable: {
        uses: "system.uses",
        autoDestroy: "system.autoDestroy"
    },
    ancestry: {
        // Ancestry specific fields if any
    }
};

/**
 * Actor type specific mapping templates
 * These extend the base Actor template with type-specific fields
 */
export const ACTOR_TYPE_SPECIFIC_MAPPINGS = {
    character: {
        // Character specific fields
        biography: "system.details.biography.value",
        appearance: "system.details.appearance",
        notes: "system.details.notes.value",
        goals: "system.details.goals.value"
    },
    npc: {
        // NPC specific fields
        biography: "system.details.biography.value",
        appearance: "system.details.appearance",
        notes: "system.details.notes.value"
    },
    vehicle: {
        // Vehicle specific fields
        description: "system.description",
        notes: "system.notes"
    },
    group: {
        // Group specific fields
        description: "system.description",
        notes: "system.notes"
    }
};

/**
 * Template metadata for version management and validation
 */
export const TEMPLATE_METADATA = {
    version: "1.0.0",
    swadeSystemVersion: "5.0.0",
    lastUpdated: "2024-01-03",
    description: "Standard mapping templates for SWADE system documents",
    author: "SWADE Babele Translation Files Generator"
};

/**
 * Required fields for each document type
 * Used for validation to ensure mapping completeness
 */
export const REQUIRED_FIELDS = {
    Item: ["description"],
    Actor: ["biography"],
    Scene: ["description"],
    JournalEntry: ["name"],
    Adventure: ["description"],
    Cards: ["description"],
    Macro: ["name"],
    Playlist: ["description"],
    RollTable: ["description"]
};

/**
 * Recommended fields for each document type
 * These fields should be included when available but are not strictly required
 */
export const RECOMMENDED_FIELDS = {
    Item: ["notes", "source", "category"],
    Actor: ["appearance", "notes", "goals"],
    Scene: ["notes", "navName"],
    JournalEntry: ["pages"],
    Adventure: ["caption"],
    Cards: ["cards"],
    Macro: ["command"],
    Playlist: ["sounds"],
    RollTable: ["results"]
};