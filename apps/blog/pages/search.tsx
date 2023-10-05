import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hive/ui";
import { Icons } from "@hive/ui/components/icons";
import { useRouter } from "next/router";
import { useState, KeyboardEvent } from "react";
import useTranslation from "next-translate/useTranslation";

export default function SearchPage() {
  const router = useRouter()
  const { t } = useTranslation("common_blog")
  const [sort, setSort] = useState("newest")
  const [input, setInput] = useState('')
  const handleEnter = (event:KeyboardEvent<HTMLInputElement>)=>{
    if (event.key === 'Enter') {
    router.push(`/search?q=${input}&s=${sort}`)
    }
  }
  const handleSelect = (e:string)=>{
    setSort(e)
    router.push(`/search?q=${input}&s=${e}`)
  }
  return (
   <div className="flex flex-col gap-12 px-4 py-8"> <div className="flex flex-col gap-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Icons.search className="h-5 w-5 rotate-90" />
        </div>
        <Input
          type="search"
          className="block p-4 pl-10 text-sm rounded-full "
          placeholder="Search..."
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          onKeyDown={(e)=>handleEnter(e)}
        />
      </div>
      <div>
      <Select 
        defaultValue='newest'
        value={sort}
        onValueChange={(e)=>handleSelect(e)}
      >
        <Label>Sort by:</Label>
        <SelectTrigger className="w-[180px]">
          <SelectValue/>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="newest">{t('select_sort.search_sorter.newest')}</SelectItem>
            <SelectItem value="popularity">{t('select_sort.search_sorter.popularity')}</SelectItem>
            <SelectItem value="relevance">{t('select_sort.search_sorter.relevance')}</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      </div>
    </div>
   
    </div>
  );
}
