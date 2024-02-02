import { Injectable } from '@angular/core'

const ICON_NAMES =
  'sort-alt-slash,arrows-h,arrows-v,pound,prime,chart-pie,reddit,code,sync,shopping-bag,server,database,hashtag,bookmark-fill,filter-fill,heart-fill,flag-fill,circle,circle-fill,bolt,history,box,at,arrow-up-right,arrow-up-left,arrow-down-left,arrow-down-right,telegram,stop-circle,stop,whatsapp,building,qrcode,car,instagram,linkedin,send,slack,moon,sun,youtube,vimeo,flag,wallet,map,link,credit-card,discord,percentage,euro,book,shield,paypal,amazon,phone,filter-slash,facebook,github,twitter,step-backward-alt,step-forward-alt,forward,backward,fast-backward,fast-forward,pause,play,compass,id-card,ticket,file-o,reply,directions-alt,directions,thumbs-up,thumbs-down,sort-numeric-down-alt,sort-numeric-up-alt,sort-alpha-down-alt,sort-alpha-up-alt,sort-numeric-down,sort-numeric-up,sort-alpha-down,sort-alpha-up,sort-alt,sort-amount-up,sort-amount-down,sort-amount-down-alt,sort-amount-up-alt,palette,undo,desktop,sliders-v,sliders-h,search-plus,search-minus,file-excel,file-pdf,check-square,chart-line,user-edit,exclamation-circle,android,google,apple,microsoft,heart,mobile,tablet,key,shopping-cart,comments,comment,briefcase,bell,paperclip,share-alt,envelope,volume-down,volume-up,volume-off,eject,money-bill,images,image,sign-in,sign-out,wifi,sitemap,chart-bar,camera,dollar,lock-open,table,map-marker,list,eye-slash,eye,folder-open,folder,video,inbox,lock,unlock,tags,tag,power-off,save,question-circle,question,copy,file,clone,calendar-times,calendar-minus,calendar-plus,ellipsis-v,ellipsis-h,bookmark,globe,replay,filter,print,align-right,align-left,align-center,align-justify,cog,cloud-download,cloud-upload,cloud,pencil,users,clock,user-minus,user-plus,trash,window-minimize,window-maximize,external-link,refresh,user,exclamation-triangle,calendar,chevron-circle-left,chevron-circle-down,chevron-circle-right,chevron-circle-up,angle-double-down,angle-double-left,angle-double-right,angle-double-up,angle-down,angle-left,angle-right,angle-up,upload,download,ban,star-fill,star,chevron-left,chevron-right,chevron-down,chevron-up,caret-left,caret-right,caret-down,caret-up,search,check,check-circle,times,times-circle,plus,plus-circle,minus,minus-circle,circle-on,circle-off,sort-down,sort-up,sort,step-backward,step-forward,th-large,arrow-down,arrow-left,arrow-right,arrow-up,bars,arrow-circle-down,arrow-circle-left,arrow-circle-right,arrow-circle-up,info,info-circle,home,spinner'

@Injectable({ providedIn: 'any' })
export class IconService {
  constructor() {
    this.icons = ICON_NAMES.split(',')
  }

  icons: string[]
}
