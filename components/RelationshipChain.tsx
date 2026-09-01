import type { EntityData, EntityRelationshipData, EntityType } from "@/lib/scoring/types";

const TYPE_COLOR: Record<EntityType, string> = {
  ORGANIZATION: "text-signal-cyan",
  SERVICE: "text-signal-amber",
  PRODUCT: "text-signal-amber",
  PERSON: "text-text-high",
  LOCATION: "text-text-mid",
  TOPIC: "text-text-mid",
};

export function RelationshipChain({ entities, relationships }: { entities: EntityData[]; relationships: EntityRelationshipData[] }) {
  const byId = new Map(entities.map((e) => [e.id, e]));

  return (
    <div className="space-y-1.5">
      {relationships.map((rel) => {
        const from = byId.get(rel.fromEntityId);
        const to = byId.get(rel.toEntityId);
        if (!from || !to) return null;
        return (
          <div key={rel.id} className="flex flex-wrap items-center gap-2 rounded-md border border-ink-line bg-ink-surface px-3 py-2 text-sm">
            <span className={`font-medium ${TYPE_COLOR[from.type]}`}>{from.name}</span>
            <span className="font-data text-[11px] text-text-low">— {rel.relationType.replace("_", " ")} →</span>
            <span className={`font-medium ${TYPE_COLOR[to.type]}`}>{to.name}</span>
          </div>
        );
      })}
    </div>
  );
}
