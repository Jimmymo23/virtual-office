import { AVATARS } from './avatarData'

export default function AvatarPicker({ selected, onSelect }) {
  return (
    <div>
      <div style={{fontSize:11,color:'#888780',marginBottom:8}}>choose your character</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
        {AVATARS.map(avatar => (
          <div key={avatar.id} onClick={() => onSelect(avatar.id)}
            style={{
              cursor:'pointer',
              borderRadius:12,
              padding:6,
              border: selected === avatar.id ? '2px solid #534AB7' : '2px solid #F1EFE8',
              background: selected === avatar.id ? '#EEEDFE' : '#F1EFE8',
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              gap:4,
              transition:'all 0.15s'
            }}>
            <div style={{width:40,height:40}} dangerouslySetInnerHTML={{__html: avatar.svg}} />
            <span style={{fontSize:9,color: selected === avatar.id ? '#534AB7' : '#888780',fontWeight: selected === avatar.id ? 500 : 400}}>
              {avatar.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}