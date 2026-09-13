import type { PropEntry } from "@project/sdk";

// A prop belongs to the element whose id is the longest dotted prefix of the prop id
// ("logo.mascot.size" → "logo.mascot"); otherwise to the scene named by its first segment,
// unless the code registered it under an explicit owner (an Editable ancestor or "brand").
export const resolveOwner = (p: PropEntry, elementIds: Iterable<string>): string => {
  if (p.owner === "brand" || !p.owner.startsWith("scene:")) return p.owner;
  let best = "";
  for (const id of elementIds) if (p.id.startsWith(id + ".") && id.length > best.length) best = id;
  return best || p.owner;
};

export const propsOf = (props: PropEntry[], owner: string, elementIds: Iterable<string>) => {
  const ids = Array.from(elementIds);
  return props.filter((p) => resolveOwner(p, ids) === owner);
};
