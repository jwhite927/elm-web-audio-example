port module Main exposing (main)

import Browser
import Html
import Html.Events as Events
import Json.Encode
import WebAudio
import WebAudio.Property


port toWebAudio : Json.Encode.Value -> Cmd msg


type alias Model =
    { freq : Float
    , playing : Bool
    }


type alias Flags =
    {}


type Msg
    = NoOp
    | TogglePlay


main : Program Flags Model Msg
main =
    Browser.element
        { init = \init -> ( { freq = 440, playing = False }, Cmd.none )
        , update =
            \msg model ->
                let
                    ( mod, cmd ) =
                        update msg model
                in
                ( mod
                , Cmd.batch
                    [ cmd
                    , audio mod
                        |> Json.Encode.list WebAudio.encode
                        |> toWebAudio
                    ]
                )
        , view =
            \model ->
                Html.div [ Events.onClick TogglePlay ]
                    [ Html.text <|
                        if model.playing then
                            "⏸️"

                        else
                            "▶"
                    ]
        , subscriptions = \sub -> Sub.none
        }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )

        TogglePlay ->
            ( { model | playing = not model.playing }, Cmd.none )


audio : Model -> List WebAudio.Node
audio model =
    if model.playing then
        [ WebAudio.oscillator
            [ WebAudio.Property.frequency model.freq ]
            [ WebAudio.gain
                [ WebAudio.Property.gain 0.1 ]
                [ WebAudio.audioDestination ]
            ]
        ]

    else
        []
