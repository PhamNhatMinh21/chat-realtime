import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";

const EMOJI_DATA = {
  "Smileys": ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","😮","🤯","😳","🥵","🥶","😱","😨","😰","😥","😢","😭","😤","😠","😡","🤬","😈","👿","💀","😴","🥱","🤤","😪","🤧","🥴","🫠"],
  "Gestures": ["👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🙏","✍️","💅","💪"],
  "Hearts": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","💕","💞","💓","💗","💖","💘","💝","💟"],
  "Animals": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🦆","🦅","🦉","🦇","🐝","🦋","🐌","🐛","🦟","🦗","🕷","🦂","🐢","🦎","🐍","🦕","🦖","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🦌","🐕","🐩","🦮","🐕‍🦺","🐈","🐈‍⬛","🐓","🦃"],
  "Food": ["🍕","🍔","🍟","🌭","🍿","🧂","🥓","🥚","🍳","🧇","🥞","🧈","🍞","🥐","🥖","🥨","🧀","🥗","🍜","🍣","🍱","🍛","🍲","🍝","🍛","🍤","🍙","🍘","🍥","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍩","🍪","🌰","🥜","🍯","🧃","🥤","🧋","☕","🍵","🫖","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧊"],
  "Celebration": ["🎉","🎊","🎈","🎁","🎂","🏆","🥇","🥈","🥉","🎯","🎮","🎲","🎭","🎬","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎺","🎸","🪕","🎻","🎰","🎳","🧩","🪁","🎣"],
  "Symbols": ["🔥","💯","✨","⭐","🌟","💥","❄️","⚡","🌈","☀️","🌙","⛅","🌊","💫","⚽","🏀","🏈","⚾","🥎","🏐","🏉","🥏","🎾","🏸","🏒","🏑","🥍","🏏","🎱","🤿","🏹","🛷","🥌","🪃","🛹","🎿","🛡","🪤","🗡","🔫","🪃","💣","🔪"]
};

const CATEGORIES = Object.keys(EMOJI_DATA);
export const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "💯"];

export function EmojiPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Smileys");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const filteredEmojis = search
    ? CATEGORIES.flatMap(cat => EMOJI_DATA[cat]).filter(e => e.includes(search))
    : EMOJI_DATA[activeCategory] || [];

  return (
    <div className="emoji-picker-popup" ref={ref}>
      <div className="emoji-search">
        <Search size={14} color="var(--text-muted)" />
        <input placeholder="Tìm emoji..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
      </div>
      {!search && (
        <div className="emoji-categories">
          {CATEGORIES.map(cat => (
            <button key={cat} className={`emoji-cat-btn ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>
      )}
      <div className="emoji-grid">
        {filteredEmojis.map((emoji, i) => (
          <button key={i} className="emoji-btn" onClick={() => { onSelect(emoji); onClose(); }}>
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
