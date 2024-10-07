const cloudinary = require('cloudinary').v2
import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { 
    ButtonBack, 
    ButtonNext,
    CarouselProvider,
    Image as PRC_Image, 
    Slide,
    Slider,
} from 'pure-react-carousel'
import 'pure-react-carousel/dist/react-carousel.es.css'
import Gallery from 'react-photo-gallery'
import formatDate from '../../../utils/formatDate'

// TODO: Why can't I use the 'Styling Any Component' method from Styled Components docs to style pure-react-carousel's components? 

const ImageContainer = styled.div`
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    & img {
        object-fit: contain;
    }
`
const SlideNavBtnContainer = styled.div`
    position: absolute;
    display: flex;
    justify-content: space-between;
    width: 100%;
    & button {
        font-size: 1.5em;
        opacity: .5;
        color: azure;
        background: rgb(11, 18, 11);
        border: none;
    }
`
const CloseCarouselBtn = styled.button`
    position: fixed;
    top: 5px;
    right: 10px;
    color: azure;
    margin: 10px 12px;
    padding: 1px 5px;
    font-size: 2.5em;
    font-weight: 400;
    opacity: .7;
    background: none;
    border: none;
    &:hover {
        cursor: pointer;
        background: rgb(11, 18, 11);
        color: azure;
    }
`

export default function AlbumName({ albumImages }) {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(null)
    const [carouselIsActive, setCarouselIsActive] = useState(false)
    console.log(`albumImages: `, albumImages)

    // Ensures overflow isn't hidden when browser back is selected while modal is open
    useEffect(() => {
        return () => document.body.style.overflow = 'initial'
    }, [])

    function handleOpenCarousel(e, imgData) {
        setCurrentSlideIndex(imgData.index)
        setCarouselIsActive(true)
        document.body.style.overflow = 'hidden'
    }

    function handleCloseCarousel() {
        setCurrentSlideIndex(null)
        setCarouselIsActive(false)
        document.body.style.overflow = 'initial'
    }

    return (
        <>
            <h2>{albumImages[0].display_location}</h2>
            <h3>{formatDate(albumImages[0].date).monthAndYear}</h3>
            <Gallery 
                photos={albumImages} 
                margin={4}
                onClick={handleOpenCarousel}
            />

            {carouselIsActive 
                ? (
                    <div className='carousel-overlay'>
                        <CarouselProvider
                            naturalSlideWidth={50}
                            naturalSlideHeight={30}
                            totalSlides={albumImages.length}
                            currentSlide={currentSlideIndex}
                            className='carousel-provider'
                        >
                            <Slider>
                                {albumImages.map((img, i) => {
                                    return (
                                        <Slide key={img.id}>
                                            <ImageContainer>
                                                <PRC_Image 
                                                    src={img.src} 
                                                    alt={img.altText}
                                                    index={i}
                                                    id={img.id}
                                                    className='slideImage'
                                                />

                                                <SlideNavBtnContainer>
                                                    <ButtonBack className='prev'>&#8678;</ButtonBack>
                                                    <ButtonNext className='next'>&#8680;</ButtonNext>
                                                </SlideNavBtnContainer>

                                                
                                            </ImageContainer>
                                        </Slide>
                                    )
                                })}
                            </Slider>
                            <CloseCarouselBtn onClick={handleCloseCarousel}>
                                &#215;
                            </CloseCarouselBtn>
                        </CarouselProvider>
                    </div>
                )
                : ''
            }
        </>
    )
}

async function getPhotoAlbum(collection, name) {
    const album = await cloudinary
        .search
        .expression(`${collection}/${name}/*`)
        .with_field('context')
        // TODO: implement cursor for when max_results is more than 100?
        .max_results(100)
        .execute()
        .then(result => {
            return result
        })
        .catch(err => console.log('error: ', err))
    
    return album
}

async function getAlbumPaths() {
    const { folders: albumPaths } = await cloudinary
        .api
        .sub_folders('outdoors', (err, res) => {
            if (!err) {
                // console.log('get folders res: ', res)
                return res
            } else {
                console.log('error fetching subfolders: ', err)
            }
        })

    return albumPaths
}

export async function getStaticPaths() {
    const albumNameAndPath = await getAlbumPaths()
    const pathData = albumNameAndPath.map(({ name, path }) => {
        return {
            params: {
                albumCollection: path.split('/')[0],
                albumName: name
            }
        }
    })

    return { 
        paths: pathData,
        fallback: false 
    }
}
  
export async function getStaticProps({ params: { albumCollection, albumName } }) {
    const { resources: albumImages } = await getPhotoAlbum(albumCollection, albumName) 
    // console.log(`albumImages.length: `, albumImages.length)
    const baseImageUrl = 'http://res.cloudinary.com/daeedgezj/image/upload'
    const albumImagesSerialized = albumImages
        .filter(image => {
            const context = image?.context
            if ( !context || context.isPrivate) {
                return false
            }
            return true
        })
        .map(image => {
            const { date, display_location = 'unknown' } = image.context
            // console.log(`display_location: `, display_location)
            // const lqipUrl = cloudinary.url(image.public_id, {transformation: [
            //     {quality: "auto", fetch_format: "auto"},
            //     {effect: "blur:700", quality: 1},
            //     {effect: "cartoonify"}
            // ]})

            const baseImageOptimized = `${baseImageUrl}/f_auto/q_auto/w_auto`
            const imagePathAndFormat = `${image.folder}/${image.filename}.${image.format}` 
            const fullImageUrl = `${baseImageOptimized}/${imagePathAndFormat}`
            // const lqipImageUrl = `${baseImageOptimized}/e_blur:1500,q_1/e_cartoonify/${imagePathAndFormat}`
            
            // NOTE: If you toggle lqip image or otherwise change the order of these properties you must also change the order of destructioning inside of the `handleOpenImageModal` function above
            return {
                src: fullImageUrl,
                // lqip_src: lqipUrl,
                id: image.asset_id,
                display_location: display_location,
                date: date,
                width: image.width,
                height: image.height,
                alt: `Photo of ${display_location} on ${date}`
            }
        })

    return {
        props: { 
            albumImages: albumImagesSerialized
        }
    }
}